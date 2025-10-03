import { CaptureDaemon } from './capture-daemon.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Claude Code Integration
 *
 * This module provides automatic prompt capture for Claude Code terminal sessions.
 * It monitors the Claude Code conversation history and automatically captures
 * prompts when code changes are made.
 *
 * How it works:
 * 1. Starts a local CaptureDaemon in the same process/terminal
 * 2. Monitors conversation state and code changes
 * 3. Auto-commits prompts to .prompts/ when git commits are made
 *
 * @class ClaudeCodeIntegration
 */
export class ClaudeCodeIntegration {
  private daemon: CaptureDaemon;
  private currentSessionId: string | null;
  private conversationBuffer: Array<{ role: 'user' | 'assistant'; content: string }>;
  private isActive: boolean;

  constructor() {
    this.daemon = new CaptureDaemon();
    this.currentSessionId = null;
    this.conversationBuffer = [];
    this.isActive = false;
  }

  /**
   * Initialize Claude Code integration
   * This should be called at the start of a Claude Code session
   */
  async init(): Promise<void> {
    // Detect if we're running in Claude Code
    if (!this.isClaudeCodeEnvironment()) {
      console.log('Not running in Claude Code environment');
      return;
    }

    console.log('Initializing Claude Code prompt capture...');

    // Start the daemon in-process (runs in same terminal as Claude Code)
    await this.daemon.start();

    // Create a new session
    // Always tag with repo path for multi-repo support
    this.currentSessionId = this.daemon.createSession('claude-code', {
      cwd: process.cwd(),
      repoPath: process.cwd(), // Used for filtering sessions by repo
      platform: process.platform,
      nodeVersion: process.version
    });

    this.isActive = true;

    // Setup hooks to capture conversation
    this.setupConversationHooks();

    console.log(`✓ Claude Code session ${this.currentSessionId} started`);
    console.log(`  Repo: ${process.cwd()}`);
  }

  /**
   * Detect if we're in a Claude Code environment
   */
  private isClaudeCodeEnvironment(): boolean {
    // Check for Claude Code specific environment variables or markers
    return (
      process.env.CLAUDE_CODE === 'true' ||
      process.env.ANTHROPIC_TOOL === 'claude-code' ||
      // Check if the parent process is claude-code
      this.checkParentProcess()
    );
  }

  /**
   * Check if parent process is Claude Code
   */
  private checkParentProcess(): boolean {
    try {
      // On Unix systems, check parent process name
      if (process.platform !== 'win32') {
        const ppid = process.ppid;
        // This is a simplified check - in production, you'd want more robust detection
        return true; // For now, assume we're in Claude Code when this module is loaded
      }
    } catch (error) {
      // Ignore errors
    }
    return false;
  }

  /**
   * Setup hooks to capture conversation flow
   */
  private setupConversationHooks(): void {
    // Hook into console.log to capture assistant responses
    // This is a simplified approach - in production, you'd want to hook into
    // the actual Claude Code message stream

    // Store original methods
    const originalLog = console.log;
    const originalError = console.error;

    // Intercept console.log
    console.log = (...args: any[]) => {
      this.captureAssistantMessage(args.join(' '));
      originalLog.apply(console, args);
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
    };
  }

  /**
   * Capture a user message
   */
  async captureUserMessage(content: string): Promise<void> {
    if (!this.isActive || !this.currentSessionId) {
      return;
    }

    this.conversationBuffer.push({ role: 'user', content });
    this.daemon.addMessage(this.currentSessionId, 'user', content);
  }

  /**
   * Capture an assistant message
   */
  private async captureAssistantMessage(content: string): Promise<void> {
    if (!this.isActive || !this.currentSessionId) {
      return;
    }

    // Filter out noise (empty messages, debug info, etc.)
    if (this.shouldIgnoreMessage(content)) {
      return;
    }

    this.conversationBuffer.push({ role: 'assistant', content });
    this.daemon.addMessage(this.currentSessionId, 'assistant', content);
  }

  /**
   * Filter out messages that shouldn't be captured
   */
  private shouldIgnoreMessage(content: string): boolean {
    // Ignore very short messages
    if (content.length < 10) {
      return true;
    }

    // Ignore debug/system messages
    const ignorePatterns = [
      /^DEBUG:/,
      /^TRACE:/,
      /^\[/,
      /^Reading file/,
      /^Writing file/,
    ];

    return ignorePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Capture a code change (file modification)
   */
  async captureCodeChange(filePath: string, beforeContent: string, afterContent: string): Promise<void> {
    if (!this.isActive || !this.currentSessionId) {
      return;
    }

    this.daemon.addCodeChange(this.currentSessionId, filePath, beforeContent, afterContent);
  }

  /**
   * Hook that gets called before a file is written
   * This should be integrated with Claude Code's file write operations
   */
  async onFileWrite(filePath: string, newContent: string): Promise<void> {
    if (!this.isActive || !this.currentSessionId) {
      return;
    }

    // Read old content if file exists
    let oldContent = '';
    try {
      if (await fs.pathExists(filePath)) {
        oldContent = await fs.readFile(filePath, 'utf-8');
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }

    // Capture the change
    this.captureCodeChange(filePath, oldContent, newContent);
  }

  /**
   * Hook that gets called on git commit
   * This is called by the git post-commit hook
   */
  async onGitCommit(commitSha: string): Promise<void> {
    console.log(`Capturing prompts for commit ${commitSha}...`);

    const repoPath = process.cwd();

    // Get all active sessions for THIS repo
    const allSessions = this.daemon.getActiveSessions();
    const repoSessions = allSessions.filter(s =>
      s.metadata.cwd === repoPath ||
      s.metadata.repoPath === repoPath
    );

    // Save each session for this repo
    for (const session of repoSessions) {
      await this.daemon.saveSession(session, commitSha);
    }

    if (repoSessions.length > 0) {
      console.log(`✓ Captured ${repoSessions.length} session(s) for commit ${commitSha}`);
    } else {
      console.log(`ℹ No active sessions to capture for this repo`);
    }

    // Start a new session for the next round of changes
    if (this.isActive) {
      this.currentSessionId = this.daemon.createSession('claude-code', {
        previousCommit: commitSha,
        cwd: process.cwd(),
        repoPath: process.cwd()
      });
    }
  }

  /**
   * Shutdown integration
   */
  async shutdown(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('Shutting down Claude Code prompt capture...');

    // Save current session if it has content
    if (this.currentSessionId) {
      const session = this.daemon.getSession(this.currentSessionId);
      if (session) {
        await this.daemon.saveSession(session);
      }
    }

    // Stop the daemon
    await this.daemon.stop();

    this.isActive = false;
  }

  /**
   * Get the daemon instance
   */
  getDaemon(): CaptureDaemon {
    return this.daemon;
  }

  /**
   * Check if integration is active
   */
  isIntegrationActive(): boolean {
    return this.isActive;
  }
}

// Export a singleton instance for easy use
export const claudeCodeIntegration = new ClaudeCodeIntegration();

// Auto-initialize if in Claude Code environment
if (process.env.AUTO_INIT_CLAUDE_CODE !== 'false') {
  claudeCodeIntegration.init().catch(console.error);
}
