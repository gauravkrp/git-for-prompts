/**
 * Claude Code Hook - Preload Module
 *
 * This module is loaded via NODE_OPTIONS before Claude Code starts.
 * It runs IN the same process as Claude, allowing us to intercept file operations.
 *
 * Usage: NODE_OPTIONS="--require ./dist/lib/claude-hook.js" claude
 */

import fs from 'fs';
import path from 'path';
import { CaptureDaemon } from './capture-daemon.js';

// Singleton daemon instance for this process
let daemon: CaptureDaemon;
let currentSessionId: string | null = null;
let isInitialized = false;

// Track original fs methods
const originalWriteFile = fs.writeFile;
const originalWriteFileSync = fs.writeFileSync;
const originalPromisesWriteFile = fs.promises.writeFile;

/**
 * Initialize the hook
 * This runs automatically when the module is loaded
 */
async function initializeHook() {
  if (isInitialized) return;

  try {
    // Only initialize if we're in a git repo with .prompts/ directory
    const cwd = process.cwd();
    const promptsDir = path.join(cwd, '.prompts');

    if (!fs.existsSync(promptsDir)) {
      // Not initialized, skip hooking
      return;
    }

    if (!fs.existsSync(path.join(cwd, '.git'))) {
      // Not a git repo, skip
      return;
    }

    // Initialize in-process daemon
    daemon = new CaptureDaemon();
    await daemon.start();

    // Create a session for this Claude Code invocation
    currentSessionId = daemon.createSession('claude-code', {
      cwd: cwd,
      repoPath: cwd,
      platform: process.platform,
      nodeVersion: process.version,
      startTime: new Date().toISOString()
    });

    // Hook file system operations
    hookFileSystem();

    // Register cleanup on exit
    process.on('exit', onExit);
    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);

    isInitialized = true;

    // Log to daemon (not to stdout to avoid interfering with Claude)
    console.error(`[gitify-prompt] Capturing session ${currentSessionId} for ${cwd}`);
  } catch (error) {
    // Silent fail - don't interfere with Claude if hook fails
    console.error(`[gitify-prompt] Hook initialization failed: ${error.message}`);
  }
}

/**
 * Hook file system write operations to capture code changes
 */
function hookFileSystem() {
  // Hook fs.writeFile (callback version)
  fs.writeFile = function(filePath: any, data: any, optionsOrCallback?: any, callback?: any) {
    const actualFilePath = typeof filePath === 'string' ? filePath : filePath.toString();
    const actualCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

    // Capture the file change
    captureFileChange(actualFilePath, data);

    // Call original method
    return originalWriteFile.call(fs, filePath, data, optionsOrCallback, actualCallback);
  } as any;

  // Hook fs.writeFileSync
  fs.writeFileSync = function(filePath: any, data: any, options?: any) {
    const actualFilePath = typeof filePath === 'string' ? filePath : filePath.toString();

    // Capture the file change
    captureFileChange(actualFilePath, data);

    // Call original method
    return originalWriteFileSync.call(fs, filePath, data, options);
  } as any;

  // Hook fs.promises.writeFile
  fs.promises.writeFile = async function(filePath: any, data: any, options?: any) {
    const actualFilePath = typeof filePath === 'string' ? filePath : filePath.toString();

    // Capture the file change
    captureFileChange(actualFilePath, data);

    // Call original method
    return originalPromisesWriteFile.call(fs.promises, filePath, data, options);
  } as any;
}

/**
 * Check if a file is ignored by git
 */
function isIgnoredByGit(filePath: string): boolean {
  try {
    const { execSync } = require('child_process');
    const relativePath = path.relative(process.cwd(), filePath);

    // Use git check-ignore to see if file is ignored
    execSync(`git check-ignore -q "${relativePath}"`, {
      cwd: process.cwd(),
      stdio: 'ignore'
    });

    // If command succeeds (exit code 0), file is ignored
    return true;
  } catch (error) {
    // If command fails (exit code 1), file is not ignored
    return false;
  }
}

/**
 * Capture a file change and send to daemon
 */
function captureFileChange(filePath: string, newContent: any) {
  if (!daemon || !currentSessionId) return;

  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

    // Skip files outside the current repo
    if (!absolutePath.startsWith(process.cwd())) {
      return;
    }

    // Skip .prompts directory itself
    if (absolutePath.includes('.prompts')) {
      return;
    }

    // Skip node_modules and other common directories
    if (absolutePath.includes('node_modules') ||
        absolutePath.includes('.git/') ||
        absolutePath.includes('dist/') ||
        absolutePath.includes('build/')) {
      return;
    }

    // Skip common build/cache directories (even if not in .gitignore)
    const commonIgnoredDirs = [
      '.next',           // Next.js
      '.nuxt',           // Nuxt.js
      '.output',         // Nuxt 3
      '.svelte-kit',     // SvelteKit
      'out',             // Next.js static export
      '.cache',          // Various tools
      '.turbo',          // Turborepo
      '.vercel',         // Vercel
      '.netlify',        // Netlify
      'coverage',        // Test coverage
      '.nyc_output',     // NYC coverage
      '__pycache__',     // Python
      '.pytest_cache',   // Pytest
      'venv',            // Python venv
      '.venv',           // Python venv
      '.DS_Store',       // macOS
      'Thumbs.db',       // Windows
    ];

    for (const dir of commonIgnoredDirs) {
      if (absolutePath.includes(`/${dir}/`) || absolutePath.endsWith(`/${dir}`)) {
        return;
      }
    }

    // Check if file matches .gitignore patterns
    if (isIgnoredByGit(absolutePath)) {
      return;
    }

    // Read old content if file exists
    let oldContent = '';
    try {
      if (fs.existsSync(absolutePath)) {
        oldContent = fs.readFileSync(absolutePath, 'utf-8');
      }
    } catch (error) {
      // File doesn't exist yet, that's ok
    }

    // Convert new content to string
    const newContentStr = typeof newContent === 'string'
      ? newContent
      : Buffer.isBuffer(newContent)
        ? newContent.toString('utf-8')
        : JSON.stringify(newContent);

    // Add to session
    daemon.addCodeChange(currentSessionId, absolutePath, oldContent, newContentStr);

    // Save session state immediately (don't wait for exit)
    // This ensures session is captured even if Claude is still running when you commit
    saveSessionState();

  } catch (error) {
    // Silent fail
  }
}

/**
 * Find and parse the Claude Code conversation history for this session
 * Matches based on session start time to ensure we get the right conversation
 */
function getConversationHistory(sessionStartTime: string): any[] {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return [];

    // Encode the project path the same way Claude Code does
    // Format: -Users-gaurav-dev-thera-fe
    const cwd = process.cwd();
    const encodedPath = cwd.replace(/\//g, '-');

    const projectDir = path.join(homeDir, '.claude', 'projects', encodedPath);

    if (!fs.existsSync(projectDir)) {
      return [];
    }

    // Convert session start time to timestamp for comparison
    const sessionStartMs = new Date(sessionStartTime).getTime();
    const sessionStartBuffer = 60000; // 1 minute buffer before session start

    // Find all conversation files
    const files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(projectDir, f));

    // Check each conversation file to find the one that contains our session
    let matchedMessages: any[] = [];
    let bestMatch: { file: string; messages: any[]; score: number } | null = null;

    for (const conversationFile of files) {
      try {
        const content = fs.readFileSync(conversationFile, 'utf-8');
        const lines = content.trim().split('\n');
        const messages: any[] = [];
        let hasMessagesInTimeRange = false;

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const entryTimestamp = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;

            // Check if this message is within our session timeframe AND matches the project path
            const entryMatchesProject = !entry.cwd || entry.cwd === cwd;
            if (entryTimestamp >= sessionStartMs - sessionStartBuffer && entryMatchesProject) {
              hasMessagesInTimeRange = true;

              // Extract user and assistant messages
              if (entry.type === 'user' && entry.message?.content) {
                messages.push({
                  role: 'user',
                  content: typeof entry.message.content === 'string'
                    ? entry.message.content
                    : JSON.stringify(entry.message.content),
                  timestamp: entry.timestamp
                });
              } else if (entry.type === 'assistant' && entry.message?.content) {
                // Extract text content from assistant messages
                const textContent = entry.message.content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('\n');

                if (textContent) {
                  messages.push({
                    role: 'assistant',
                    content: textContent,
                    timestamp: entry.timestamp
                  });
                }
              }
            }
          } catch (parseError) {
            // Skip invalid lines
          }
        }

        // Score this conversation based on how well it matches
        if (hasMessagesInTimeRange && messages.length > 0) {
          const score = messages.length; // Simple scoring: more messages = better match
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { file: conversationFile, messages, score };
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }

    return bestMatch ? bestMatch.messages : [];
  } catch (error) {
    console.error(`[gitify-prompt] Failed to read conversation history: ${error.message}`);
    return [];
  }
}

/**
 * Get git author information
 */
function getGitAuthor(): { name: string; email: string } | null {
  try {
    const { execSync } = require('child_process');

    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();

    return { name, email };
  } catch (error) {
    return null;
  }
}

/**
 * Get current git branch information
 */
function getGitBranch(): { current: string; parent?: string } | null {
  try {
    const { execSync } = require('child_process');

    // Get current branch name
    const current = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // Try to detect parent branch by checking tracking branch
    let parent: string | undefined;
    try {
      const trackingBranch = execSync(`git config branch.${current}.merge`, { encoding: 'utf-8' }).trim();
      if (trackingBranch) {
        // Extract branch name from refs/heads/...
        parent = trackingBranch.replace('refs/heads/', '');
      }
    } catch {
      // No tracking branch configured
    }

    // If no tracking branch, try to infer from common branches
    if (!parent && current !== 'main' && current !== 'master') {
      // Check if main or master exists
      try {
        execSync('git rev-parse --verify main', { encoding: 'utf-8', stdio: 'ignore' });
        parent = 'main';
      } catch {
        try {
          execSync('git rev-parse --verify master', { encoding: 'utf-8', stdio: 'ignore' });
          parent = 'master';
        } catch {
          // No main or master
        }
      }
    }

    return { current, parent };
  } catch (error) {
    return null;
  }
}

/**
 * Save current session state
 * Called both on file changes and on exit
 */
function saveSessionState() {
  if (!daemon || !currentSessionId) return;

  try {
    const session = daemon.getSession(currentSessionId);
    if (!session) return;

    const metaDir = path.join(process.cwd(), '.prompts', '.meta');
    const sessionFile = path.join(metaDir, `session-${session.id}.json`);

    // Ensure .meta directory exists
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }

    // Get the conversation history from Claude Code's storage
    const sessionStartStr = session.startTime instanceof Date
      ? session.startTime.toISOString()
      : session.startTime;
    const conversationMessages = getConversationHistory(sessionStartStr);

    // Get git author details
    const gitAuthor = getGitAuthor();

    // Get git branch information
    const gitBranch = getGitBranch();

    // Format session for storage
    const sessionData = {
      id: session.id,
      tool: session.tool,
      startTime: session.startTime,
      author: gitAuthor,
      messages: conversationMessages,
      filesModified: session.codeChanges.map(change => ({
        file: change.filePath,
        timestamp: change.timestamp
      })),
      metadata: {
        ...session.metadata,
        branch: gitBranch?.current,
        parentBranch: gitBranch?.parent,
        fileCount: session.codeChanges.length,
        messageCount: conversationMessages.length,
        lastUpdate: new Date().toISOString()
      }
    };

    // Save session data
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  } catch (error) {
    // Silent fail
  }
}

/**
 * Cleanup on process exit
 */
function onExit() {
  if (!daemon || !currentSessionId) return;

  try {
    const session = daemon.getSession(currentSessionId);
    if (session && session.codeChanges.length > 0) {
      saveSessionState();
      console.error(`[gitify-prompt] Captured session with ${session.codeChanges.length} file changes`);
    }
  } catch (error) {
    console.error(`[gitify-prompt] Failed to save session: ${error.message}`);
  }
}

// Auto-initialize when module is loaded using top-level await
// This ensures the hook is ready before any user code runs
await initializeHook().catch((error) => {
  // Silent fail - don't break Claude if hook fails
  console.error('[gitify-prompt] Hook initialization failed silently');
});

export { daemon, currentSessionId };
