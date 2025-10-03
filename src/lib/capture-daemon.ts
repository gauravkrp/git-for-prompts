import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PromptStore } from './prompt-store.js';
import crypto from 'crypto';

/**
 * CaptureSession represents a single AI conversation session
 */
interface CaptureSession {
  id: string;
  tool: 'claude-code' | 'cursor' | 'chatgpt' | 'generic';
  startTime: Date;
  messages: ConversationMessage[];
  codeChanges: CodeChange[];
  metadata: Record<string, any>;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CodeChange {
  filePath: string;
  beforeContent: string;
  afterContent: string;
  timestamp: Date;
}

/**
 * CaptureDaemon - Background service for automatic prompt capture
 *
 * This daemon runs in the background and:
 * - Monitors AI tool interactions (Claude Code, Cursor, etc.)
 * - Buffers conversation history and code changes
 * - Auto-commits prompts when Git commits are made
 * - Links prompts to Git commits via metadata
 *
 * @class CaptureDaemon
 */
export class CaptureDaemon extends EventEmitter {
  private sessions: Map<string, CaptureSession>;
  private store: PromptStore;
  private configPath: string;
  private config: DaemonConfig;
  private isRunning: boolean;
  private logPath: string;

  constructor() {
    super();
    this.sessions = new Map();
    this.store = new PromptStore();
    this.configPath = path.join(os.homedir(), '.promptrc.json');
    this.config = this.loadConfig();
    this.isRunning = false;
    this.logPath = path.join(os.tmpdir(), 'prompt-daemon.log');
  }

  /**
   * Start the capture daemon
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Daemon already running');
      return;
    }

    this.log('Starting capture daemon...');
    this.isRunning = true;

    // Watch for git hooks
    if (this.config.autoCapture.enabled) {
      await this.setupGitHooks();
    }

    this.emit('started');
    this.log('Capture daemon started');
  }

  /**
   * Stop the capture daemon
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('Stopping capture daemon...');

    // Save any active sessions
    for (const [sessionId, session] of this.sessions) {
      await this.saveSession(session);
    }

    this.isRunning = false;
    this.emit('stopped');
    this.log('Capture daemon stopped');
  }

  /**
   * Create a new capture session
   */
  createSession(tool: CaptureSession['tool'], metadata: Record<string, any> = {}): string {
    const sessionId = crypto.randomBytes(8).toString('hex');
    const session: CaptureSession = {
      id: sessionId,
      tool,
      startTime: new Date(),
      messages: [],
      codeChanges: [],
      metadata
    };

    this.sessions.set(sessionId, session);
    this.log(`Created session ${sessionId} for ${tool}`);
    this.emit('session-created', session);

    return sessionId;
  }

  /**
   * Add a message to an active session
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log(`Session ${sessionId} not found`);
      return;
    }

    session.messages.push({
      role,
      content,
      timestamp: new Date()
    });

    this.emit('message-added', sessionId, role, content);
  }

  /**
   * Add a code change to an active session
   */
  addCodeChange(sessionId: string, filePath: string, beforeContent: string, afterContent: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log(`Session ${sessionId} not found`);
      return;
    }

    session.codeChanges.push({
      filePath,
      beforeContent,
      afterContent,
      timestamp: new Date()
    });

    this.emit('code-change-added', sessionId, filePath);
  }

  /**
   * Save a session to the prompt store
   * This is automatically called on git commits
   */
  async saveSession(session: CaptureSession, commitSha?: string): Promise<void> {
    if (session.messages.length === 0) {
      this.log(`Session ${session.id} has no messages, skipping save`);
      return;
    }

    // Generate a prompt ID based on the conversation
    const promptId = this.generatePromptId(session);

    // Build prompt content from conversation
    const content = this.buildPromptContent(session);

    // Prepare metadata
    const metadata = {
      model: session.metadata.model || 'unknown',
      tags: [
        'auto-captured',
        session.tool,
        ...(session.metadata.tags || [])
      ],
      temperature: session.metadata.temperature,
      maxTokens: session.metadata.maxTokens,
      tool: session.tool,
      sessionId: session.id,
      captureTime: session.startTime.toISOString(),
      gitCommit: commitSha,
      filesModified: session.codeChanges.map(c => c.filePath)
    };

    // Save to store
    const commitMessage = `Auto-captured from ${session.tool} (${session.messages.length} messages)`;

    try {
      await this.store.savePrompt(promptId, {
        content,
        commitMessage,
        metadata,
        description: this.summarizeConversation(session)
      });

      this.log(`Saved session ${session.id} as prompt ${promptId}`);
      this.emit('session-saved', session.id, promptId);

      // Remove from active sessions
      this.sessions.delete(session.id);
    } catch (error) {
      this.log(`Error saving session ${session.id}: ${error.message}`);
      this.emit('error', error);
    }
  }

  /**
   * Setup git hooks to auto-capture on commits
   */
  private async setupGitHooks(): Promise<void> {
    const gitHookPath = path.join(process.cwd(), '.git', 'hooks', 'post-commit');

    // Check if .git directory exists
    if (!await fs.pathExists(path.join(process.cwd(), '.git'))) {
      this.log('Not a git repository, skipping git hook setup');
      return;
    }

    const hookScript = `#!/bin/sh
# Auto-generated by Gitify Prompt
# This hook captures active AI sessions on commit

# Find the gitify-prompt installation
GITIFY_PROMPT_PATH=$(which gitify-prompt 2>/dev/null)

if [ -z "$GITIFY_PROMPT_PATH" ]; then
  # Not installed globally, try local node_modules
  if [ -d "./node_modules/gitify-prompt" ]; then
    GITIFY_PROMPT_PATH="./node_modules/.bin/gitify-prompt"
  else
    # Development mode - use this repo
    GITIFY_PROMPT_PATH="./dist/cli/index.js"
  fi
fi

# For now, we'll skip the git hook since Claude Code integration
# runs in-process and doesn't need the hook to trigger
# The integration will be called directly when using \`claude\` command

# Future: implement proper git hook integration
exit 0
`;

    try {
      await fs.writeFile(gitHookPath, hookScript, { mode: 0o755 });
      this.log('Git post-commit hook installed');
    } catch (error) {
      this.log(`Failed to install git hook: ${error.message}`);
    }
  }

  /**
   * Called by git hook on commit
   */
  async onCommit(commitSha: string): Promise<void> {
    this.log(`Git commit detected: ${commitSha}`);

    // Save all active sessions
    for (const [sessionId, session] of this.sessions) {
      await this.saveSession(session, commitSha);
    }

    this.emit('commit-processed', commitSha);
  }

  /**
   * Generate a meaningful prompt ID from the session
   */
  private generatePromptId(session: CaptureSession): string {
    // Try to extract intent from first user message
    const firstMessage = session.messages.find(m => m.role === 'user');
    if (!firstMessage) {
      return `auto-${session.id}`;
    }

    // Extract first 3 words and sanitize
    const words = firstMessage.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 3)
      .join('-');

    return words || `auto-${session.id}`;
  }

  /**
   * Build prompt content from conversation history
   */
  private buildPromptContent(session: CaptureSession): string {
    let content = `# Auto-captured conversation from ${session.tool}\n\n`;
    content += `Session ID: ${session.id}\n`;
    content += `Started: ${session.startTime.toISOString()}\n\n`;

    content += `## Conversation\n\n`;
    for (const msg of session.messages) {
      content += `**${msg.role}**: ${msg.content}\n\n`;
    }

    if (session.codeChanges.length > 0) {
      content += `## Code Changes (${session.codeChanges.length})\n\n`;
      for (const change of session.codeChanges) {
        content += `- ${change.filePath}\n`;
      }
    }

    return content;
  }

  /**
   * Generate a summary of the conversation
   */
  private summarizeConversation(session: CaptureSession): string {
    const firstUserMsg = session.messages.find(m => m.role === 'user')?.content || '';
    return firstUserMsg.substring(0, 100) + (firstUserMsg.length > 100 ? '...' : '');
  }

  /**
   * Load daemon configuration
   */
  private loadConfig(): DaemonConfig {
    const defaultConfig: DaemonConfig = {
      autoCapture: {
        enabled: true,
        tools: {
          'claude-code': true,
          'cursor': true,
          'chatgpt': false,
          'generic': true
        }
      },
      privacy: {
        excludePatterns: [
          '*.env',
          '*secret*',
          '*password*',
          '*api*key*'
        ],
        maskSensitiveData: true
      },
      storage: {
        maxSessionAge: 86400000, // 24 hours
        autoCleanup: true
      }
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const userConfig = fs.readJsonSync(this.configPath);
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      this.log(`Error loading config: ${error.message}`);
    }

    return defaultConfig;
  }

  /**
   * Save daemon configuration
   */
  async saveConfig(config: Partial<DaemonConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    this.log('Configuration saved');
  }

  /**
   * Get current configuration
   */
  getConfig(): DaemonConfig {
    return { ...this.config };
  }

  /**
   * Log daemon activity
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Append to log file
    fs.appendFileSync(this.logPath, logMessage);

    // Emit log event
    this.emit('log', message);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): CaptureSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CaptureSession | undefined {
    return this.sessions.get(sessionId);
  }
}

interface DaemonConfig {
  autoCapture: {
    enabled: boolean;
    tools: {
      'claude-code': boolean;
      'cursor': boolean;
      'chatgpt': boolean;
      'generic': boolean;
    };
  };
  privacy: {
    excludePatterns: string[];
    maskSensitiveData: boolean;
  };
  storage: {
    maxSessionAge: number;
    autoCleanup: boolean;
  };
}
