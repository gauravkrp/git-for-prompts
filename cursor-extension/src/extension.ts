import * as vscode from 'vscode';
import { CaptureDaemon } from 'gitify-prompt';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Cursor Prompts Extension
 *
 * This extension automatically captures Cursor AI interactions and saves them
 * to the Git for Prompts repository. It provides:
 *
 * - Automatic capture of Cursor chat sessions
 * - One-click manual save of prompts
 * - Auto-linking of prompts to git commits
 * - Prompt history viewer
 *
 * The extension hooks into:
 * - Cursor's AI chat panel
 * - VS Code's file system events
 * - Git extension for commit detection
 */

let daemon: CaptureDaemon;
let currentSessionId: string | null = null;
let statusBarItem: vscode.StatusBarItem;
let isAutoCapturing = false;

export function activate(context: vscode.ExtensionContext) {
  console.log('Cursor Prompts extension is now active');

  // Initialize daemon
  daemon = new CaptureDaemon();

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(record) Prompts: Off";
  statusBarItem.tooltip = "Click to toggle prompt auto-capture";
  statusBarItem.command = 'cursor-prompts.toggleAutoCapture';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Check if we're in a git repository with .prompts initialized
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const promptsPath = path.join(rootPath, '.prompts');

    if (fs.existsSync(promptsPath)) {
      // Auto-start daemon if configured
      const config = vscode.workspace.getConfiguration('cursor-prompts');
      if (config.get('autoCapture', true)) {
        startAutoCapture();
      }
    } else {
      vscode.window.showInformationMessage(
        'Git for Prompts not initialized. Run "prompt init" to start capturing prompts.',
        'Initialize Now'
      ).then(selection => {
        if (selection === 'Initialize Now') {
          initializePromptRepo();
        }
      });
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cursor-prompts.savePrompt', savePromptManually)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cursor-prompts.viewHistory', viewPromptHistory)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cursor-prompts.toggleAutoCapture', toggleAutoCapture)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cursor-prompts.showActiveSessions', showActiveSessions)
  );

  // Monitor file changes to capture code modifications
  const config = vscode.workspace.getConfiguration('cursor-prompts');
  if (config.get('captureCodeChanges', true)) {
    setupFileWatcher(context);
  }

  // Monitor git commits
  if (config.get('linkToGitCommits', true)) {
    setupGitWatcher(context);
  }

  // Hook into Cursor's AI chat (if available)
  hookIntoCursorChat(context);
}

/**
 * Start automatic prompt capture
 */
async function startAutoCapture() {
  if (isAutoCapturing) {
    return;
  }

  try {
    await daemon.start();

    // Create a new session
    currentSessionId = daemon.createSession('cursor', {
      workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      vscodeVersion: vscode.version
    });

    isAutoCapturing = true;
    statusBarItem.text = "$(circle-filled) Prompts: On";
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

    const config = vscode.workspace.getConfiguration('cursor-prompts');
    if (config.get('showNotifications', true)) {
      vscode.window.showInformationMessage('Prompt auto-capture started');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start prompt capture: ${error.message}`);
  }
}

/**
 * Stop automatic prompt capture
 */
async function stopAutoCapture() {
  if (!isAutoCapturing) {
    return;
  }

  try {
    // Save current session if it exists
    if (currentSessionId) {
      const session = daemon.getSession(currentSessionId);
      if (session && session.messages.length > 0) {
        await daemon.saveSession(session);
      }
      currentSessionId = null;
    }

    await daemon.stop();
    isAutoCapturing = false;
    statusBarItem.text = "$(record) Prompts: Off";
    statusBarItem.backgroundColor = undefined;

    const config = vscode.workspace.getConfiguration('cursor-prompts');
    if (config.get('showNotifications', true)) {
      vscode.window.showInformationMessage('Prompt auto-capture stopped');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop prompt capture: ${error.message}`);
  }
}

/**
 * Toggle auto-capture on/off
 */
async function toggleAutoCapture() {
  if (isAutoCapturing) {
    await stopAutoCapture();
  } else {
    await startAutoCapture();
  }
}

/**
 * Manually save the current prompt/conversation
 */
async function savePromptManually() {
  if (!currentSessionId) {
    // Create a session if none exists
    await startAutoCapture();
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  // Prompt for a description
  const description = await vscode.window.showInputBox({
    prompt: 'Enter a description for this prompt',
    placeHolder: 'e.g., Refactor user authentication logic'
  });

  if (!description) {
    return;
  }

  // Add the current selection or full file as context
  const selection = editor.selection;
  const text = editor.document.getText(selection.isEmpty ? undefined : selection);

  // Add a user message with the context
  daemon.addMessage(currentSessionId!, 'user', `${description}\n\n\`\`\`\n${text}\n\`\`\``);

  // Save the session
  const session = daemon.getSession(currentSessionId!);
  if (session) {
    await daemon.saveSession(session);
    vscode.window.showInformationMessage(`✓ Prompt saved: ${description}`);

    // Start a new session
    currentSessionId = daemon.createSession('cursor', {
      workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    });
  }
}

/**
 * View prompt history
 */
async function viewPromptHistory() {
  // This would open a webview with the prompt history
  // For now, show a simple quick pick
  vscode.window.showInformationMessage('Prompt history viewer coming soon!');
}

/**
 * Show active prompt sessions
 */
async function showActiveSessions() {
  const sessions = daemon.getActiveSessions();

  if (sessions.length === 0) {
    vscode.window.showInformationMessage('No active prompt sessions');
    return;
  }

  const items = sessions.map(session => ({
    label: `Session ${session.id.substring(0, 8)}`,
    description: `${session.messages.length} messages, ${session.codeChanges.length} code changes`,
    detail: `Started: ${session.startTime.toLocaleString()}`,
    sessionId: session.id
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a session to view details'
  });

  if (selected) {
    const session = daemon.getSession(selected.sessionId);
    if (session) {
      // Show session details
      const panel = vscode.window.createWebviewPanel(
        'promptSession',
        `Prompt Session ${session.id.substring(0, 8)}`,
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = generateSessionHTML(session);
    }
  }
}

/**
 * Setup file watcher to capture code changes
 */
function setupFileWatcher(context: vscode.ExtensionContext) {
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');

  watcher.onDidChange(async (uri) => {
    if (!isAutoCapturing || !currentSessionId) {
      return;
    }

    // Ignore non-code files and .prompts directory
    if (uri.fsPath.includes('.prompts') || uri.fsPath.includes('node_modules')) {
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const content = document.getText();

      // Add code change to session
      // Note: We don't have the "before" content here, so we'll mark it as modified
      daemon.addCodeChange(currentSessionId, uri.fsPath, '', content);
    } catch (error) {
      // Ignore errors
    }
  });

  context.subscriptions.push(watcher);
}

/**
 * Setup git watcher to auto-save on commits
 */
function setupGitWatcher(context: vscode.ExtensionContext) {
  // Watch for .git/COMMIT_EDITMSG changes as a proxy for commits
  const gitPath = path.join(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
    '.git',
    'COMMIT_EDITMSG'
  );

  if (!fs.existsSync(path.dirname(gitPath))) {
    return;
  }

  let lastCommitTime = 0;

  const watcher = vscode.workspace.createFileSystemWatcher(gitPath);

  watcher.onDidChange(async () => {
    // Debounce: only trigger if at least 2 seconds have passed
    const now = Date.now();
    if (now - lastCommitTime < 2000) {
      return;
    }
    lastCommitTime = now;

    if (!isAutoCapturing || !currentSessionId) {
      return;
    }

    // Get the latest commit SHA
    const { exec } = require('child_process');
    exec('git rev-parse HEAD', { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath }, async (error, stdout) => {
      if (error) {
        return;
      }

      const commitSha = stdout.trim();

      // Save the session with the commit SHA
      const session = daemon.getSession(currentSessionId!);
      if (session && session.messages.length > 0) {
        await daemon.saveSession(session, commitSha);

        const config = vscode.workspace.getConfiguration('cursor-prompts');
        if (config.get('showNotifications', true)) {
          vscode.window.showInformationMessage(`✓ Prompts captured for commit ${commitSha.substring(0, 7)}`);
        }

        // Start a new session
        currentSessionId = daemon.createSession('cursor', {
          workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          previousCommit: commitSha
        });
      }
    });
  });

  context.subscriptions.push(watcher);
}

/**
 * Hook into Cursor's AI chat functionality
 */
function hookIntoCursorChat(context: vscode.ExtensionContext) {
  // Check if we're running in Cursor (not regular VS Code)
  const isCursor = vscode.env.appName.toLowerCase().includes('cursor');

  if (!isCursor) {
    console.log('Not running in Cursor, skipping chat hook');
    return;
  }

  // Cursor stores chat data in: ~/Library/Application Support/Cursor/User/globalStorage
  // Look for chat-related files
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) return;

  let cursorDataPath: string;
  if (process.platform === 'darwin') {
    cursorDataPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor');
  } else if (process.platform === 'win32') {
    cursorDataPath = path.join(process.env.APPDATA || '', 'Cursor');
  } else {
    cursorDataPath = path.join(homeDir, '.config', 'Cursor');
  }

  if (!fs.existsSync(cursorDataPath)) {
    console.log('Cursor data directory not found:', cursorDataPath);
    return;
  }

  // Watch for chat database changes
  const chatPatterns = [
    path.join(cursorDataPath, 'User', 'globalStorage', '**', '*.json'),
    path.join(cursorDataPath, 'User', 'workspaceStorage', '**', '*.json'),
  ];

  // Monitor chat files for changes
  chatPatterns.forEach(pattern => {
    try {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange(async (uri) => {
        if (!isAutoCapturing || !currentSessionId) return;

        // Try to parse and extract chat messages
        try {
          const content = fs.readFileSync(uri.fsPath, 'utf-8');
          const data = JSON.parse(content);

          // Look for chat-like structures (this is speculative without Cursor's docs)
          if (data.messages || data.chat || data.conversation) {
            const messages = data.messages || data.chat || data.conversation;
            if (Array.isArray(messages)) {
              messages.forEach((msg: any) => {
                if (msg.role && msg.content) {
                  daemon.addMessage(currentSessionId!, msg.role, msg.content);
                }
              });
            }
          }
        } catch (err) {
          // Not a chat file or invalid JSON
        }
      });

      context.subscriptions.push(watcher);
    } catch (err) {
      // Pattern might not be valid
    }
  });

  console.log('Cursor chat monitoring enabled');
}

/**
 * Initialize prompt repository
 */
async function initializePromptRepo() {
  const terminal = vscode.window.createTerminal('Prompt Init');
  terminal.show();
  terminal.sendText('prompt init');
}

/**
 * Generate HTML for session viewer
 */
function generateSessionHTML(session: any): string {
  const messages = session.messages
    .map((msg: any) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `
        <div class="message ${msg.role}">
          <strong>${role}:</strong>
          <p>${escapeHtml(msg.content)}</p>
          <small>${new Date(msg.timestamp).toLocaleString()}</small>
        </div>
      `;
    })
    .join('');

  const codeChanges = session.codeChanges
    .map((change: any) => `<li>${escapeHtml(change.filePath)}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 20px; }
        .message { margin: 15px 0; padding: 10px; border-radius: 5px; }
        .message.user { background: #e3f2fd; }
        .message.assistant { background: #f5f5f5; }
        .message strong { color: #1976d2; }
        .message p { margin: 5px 0; white-space: pre-wrap; }
        .message small { color: #666; }
        h2 { color: #1976d2; }
        ul { margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Prompt Session ${session.id.substring(0, 8)}</h1>
      <p>Started: ${session.startTime.toLocaleString()}</p>
      <p>Tool: ${session.tool}</p>

      <h2>Conversation (${session.messages.length} messages)</h2>
      ${messages}

      ${codeChanges ? `
        <h2>Code Changes (${session.codeChanges.length})</h2>
        <ul>${codeChanges}</ul>
      ` : ''}
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function deactivate() {
  if (isAutoCapturing) {
    daemon.stop();
  }
}
