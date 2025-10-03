import { DaemonClient } from './daemon-server.js';
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
 * 1. Connects to the persistent background daemon via DaemonClient
 * 2. Monitors conversation state and code changes
 * 3. Auto-commits prompts to .prompts/ when git commits are made
 *
 * @class ClaudeCodeIntegration
 */
export class ClaudeCodeIntegration {
  private client: DaemonClient;
  private currentSessionId: string | null;
  private conversationBuffer: Array<{ role: 'user' | 'assistant'; content: string }>;
  private isActive: boolean;

  constructor() {
    this.client = new DaemonClient();
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

    // Check if daemon is running
    const daemonRunning = await this.client.isRunning();
    if (!daemonRunning) {
      console.log('Daemon not running. Start it with: gitify-prompt daemon start');
      return;
    }

    console.log('Initializing Claude Code prompt capture...');

    // Create a new session via daemon client
    this.currentSessionId = await this.client.createSession('claude-code', {
      cwd: process.cwd(),
      platform: process.platform,
      nodeVersion: process.version
    });

    this.isActive = true;

    // Setup hooks to capture conversation
    this.setupConversationHooks();

    console.log(`Claude Code session ${this.currentSessionId} started`);
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
    await this.client.addMessage(this.currentSessionId, 'user', content);
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
    await this.client.addMessage(this.currentSessionId, 'assistant', content);
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

    await this.client.addCodeChange(this.currentSessionId, filePath, beforeContent, afterContent);
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
    if (!this.isActive || !this.currentSessionId) {
      return;
    }

    console.log(`Capturing prompts for commit ${commitSha}...`);

    // Save the current session
    await this.client.saveSession(this.currentSessionId, commitSha);
    console.log(`✓ Prompts captured and linked to commit ${commitSha}`);

    // Start a new session for the next round of changes
    this.currentSessionId = await this.client.createSession('claude-code', {
      previousCommit: commitSha,
      cwd: process.cwd()
    });
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
      await this.client.saveSession(this.currentSessionId);
    }

    this.isActive = false;
  }

  /**
   * Get the daemon client instance
   */
  getClient(): DaemonClient {
    return this.client;
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
