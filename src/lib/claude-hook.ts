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

  } catch (error) {
    // Silent fail
  }
}

/**
 * Cleanup on process exit
 * Save session to a temp file for the git hook to pick up
 */
function onExit() {
  if (!daemon || !currentSessionId) return;

  try {
    const session = daemon.getSession(currentSessionId);
    if (session && session.codeChanges.length > 0) {
      // Save session to temp file for git hook to pick up on commit
      const metaDir = path.join(process.cwd(), '.prompts', '.meta');
      const sessionFile = path.join(metaDir, 'last-session.json');

      // Ensure .meta directory exists
      if (!fs.existsSync(metaDir)) {
        fs.mkdirSync(metaDir, { recursive: true });
      }

      // Format session for storage
      const sessionData = {
        id: session.id,
        tool: session.tool,
        startTime: session.startTime,
        messages: session.messages,
        codeChanges: session.codeChanges.map(change => ({
          file: change.filePath,
          beforeContent: change.beforeContent,
          afterContent: change.afterContent,
          timestamp: change.timestamp
        })),
        metadata: session.metadata
      };

      // Save as array (can have multiple sessions)
      fs.writeFileSync(sessionFile, JSON.stringify([sessionData], null, 2));

      console.error(`[gitify-prompt] Captured ${session.codeChanges.length} file changes (session saved)`);
    }
  } catch (error) {
    console.error(`[gitify-prompt] Failed to save session: ${error.message}`);
  }
}

// Auto-initialize when module is loaded
initializeHook().catch(() => {
  // Silent fail - don't break Claude if hook fails
});

export { daemon, currentSessionId };
