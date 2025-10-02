const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');

function activate(context) {
  console.log('Git for Prompts extension activated');

  // Save Prompt command
  let savePromptCommand = vscode.commands.registerCommand('git-prompts.savePrompt', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active text editor');
      return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    if (!text) {
      vscode.window.showErrorMessage('No text selected or empty document');
      return;
    }

    // Get prompt ID
    const promptId = await vscode.window.showInputBox({
      prompt: 'Enter prompt ID',
      placeHolder: 'e.g., user-onboarding-email'
    });

    if (!promptId) {
      return;
    }

    // Get commit message
    const commitMessage = await vscode.window.showInputBox({
      prompt: 'Enter commit message',
      placeHolder: 'e.g., Update email template'
    });

    // Get model
    const model = await vscode.window.showQuickPick(
      ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'custom'],
      {
        placeHolder: 'Select model'
      }
    );

    // Get tags
    const tags = await vscode.window.showInputBox({
      prompt: 'Enter tags (comma-separated)',
      placeHolder: 'e.g., email, onboarding, template'
    });

    // Save the prompt
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const cwd = workspaceFolder.uri.fsPath;

    // Create a temporary file with the content
    const fs = require('fs');
    const os = require('os');
    const tmpFile = path.join(os.tmpdir(), `prompt-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, text);

    // Build command
    let command = `prompt commit "${promptId}"`;
    if (commitMessage) command += ` -m "${commitMessage}"`;
    if (model) command += ` --model ${model}`;
    if (tags) command += ` --tags "${tags}"`;
    command += ` -c "${text.replace(/"/g, '\\"')}"`;

    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Failed to save prompt: ${error.message}`);
        return;
      }
      vscode.window.showInformationMessage(`Prompt saved: ${promptId}`);
    });
  });

  // View History command
  let viewHistoryCommand = vscode.commands.registerCommand('git-prompts.viewHistory', async () => {
    const promptId = await vscode.window.showInputBox({
      prompt: 'Enter prompt ID to view history',
      placeHolder: 'e.g., user-onboarding-email'
    });

    if (!promptId) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const cwd = workspaceFolder.uri.fsPath;

    exec(`prompt history "${promptId}"`, { cwd }, (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Failed to get history: ${error.message}`);
        return;
      }

      // Create output channel and show history
      const outputChannel = vscode.window.createOutputChannel('Prompt History');
      outputChannel.appendLine(stdout);
      outputChannel.show();
    });
  });

  // Run Test command
  let runTestCommand = vscode.commands.registerCommand('git-prompts.runTest', async () => {
    const editor = vscode.window.activeTextEditor;
    let promptId;

    if (editor) {
      // Try to extract prompt ID from file name or ask user
      const fileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName));
      promptId = await vscode.window.showInputBox({
        prompt: 'Enter prompt ID to test',
        placeHolder: 'e.g., user-onboarding-email',
        value: fileName
      });
    } else {
      promptId = await vscode.window.showInputBox({
        prompt: 'Enter prompt ID to test (or leave empty to test all)',
        placeHolder: 'e.g., user-onboarding-email'
      });
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const cwd = workspaceFolder.uri.fsPath;

    // Create output channel for test results
    const outputChannel = vscode.window.createOutputChannel('Prompt Tests');
    outputChannel.show();
    outputChannel.appendLine('Running tests...');

    const command = promptId ? `prompt test "${promptId}" --verbose` : 'prompt test --verbose';

    exec(command, { cwd }, (error, stdout, stderr) => {
      outputChannel.appendLine(stdout);
      if (stderr) {
        outputChannel.appendLine(stderr);
      }

      if (error) {
        vscode.window.showErrorMessage('Some tests failed. Check output for details.');
      } else {
        vscode.window.showInformationMessage('All tests passed!');
      }
    });
  });

  context.subscriptions.push(savePromptCommand);
  context.subscriptions.push(viewHistoryCommand);
  context.subscriptions.push(runTestCommand);

  // Add status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(git-commit) Prompts';
  statusBarItem.command = 'git-prompts.savePrompt';
  statusBarItem.tooltip = 'Save prompt to repository';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};