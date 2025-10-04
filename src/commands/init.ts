import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { PromptStore } from '../lib/prompt-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initCommand(options) {
  const spinner = ora('Initializing prompts repository...').start();

  try {
    const store = new PromptStore();

    if (await store.exists()) {
      spinner.fail(chalk.red('Prompts repository already exists in this directory'));
      return;
    }

    await store.init();

    // Install git hooks
    await installGitHooks();

    spinner.succeed(chalk.green('Prompts repository initialized successfully!'));
    console.log(chalk.gray('\nCreated structure:'));
    console.log(chalk.gray('  .prompts/'));
    console.log(chalk.gray('  ├── config.json'));
    console.log(chalk.gray('  ├── prompts/'));
    console.log(chalk.gray('  └── .meta/'));

    // Show setup instructions for Claude Code integration
    await showClaudeSetupInstructions();

  } catch (error) {
    spinner.fail(chalk.red(`Failed to initialize: ${error.message}`));
    process.exit(1);
  }
}

async function installGitHooks() {
  const gitHookPath = path.join(process.cwd(), '.git', 'hooks', 'post-commit');

  // Check if .git directory exists
  if (!await fs.pathExists(path.join(process.cwd(), '.git'))) {
    console.log(chalk.yellow('\nWarning: Not a git repository. Git hooks will not be installed.'));
    return;
  }

  const hookScript = `#!/bin/sh
# Gitify Prompt - Auto-capture git hook
# This hook saves captured Claude Code sessions to .prompts/ on commit

# Get the commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

# Find gitify-prompt installation
GITIFY_BIN=$(which gitify-prompt 2>/dev/null)

if [ -z "$GITIFY_BIN" ]; then
  # Not in PATH, try local node_modules
  if [ -f "./node_modules/.bin/gitify-prompt" ]; then
    GITIFY_BIN="./node_modules/.bin/gitify-prompt"
  elif [ -f "./dist/cli/index.js" ]; then
    GITIFY_BIN="./dist/cli/index.js"
  else
    echo "Warning: gitify-prompt not found, skipping prompt capture" >&2
    exit 0
  fi
fi

# Run the capture hook (this saves sessions from the in-process daemon)
# The hook module in claude-hook.ts already captured the session
# We just need to save it now linked to this commit
node -e "
const fs = require('fs');
const path = require('path');

// Load the sessions from the last Claude invocation
const sessionFile = path.join(process.cwd(), '.prompts', '.meta', 'last-session.json');

if (fs.existsSync(sessionFile)) {
  const sessions = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));

  // Save each session linked to this commit
  sessions.forEach(session => {
    const timestamp = Date.now();
    const filename = \\\`\\\${timestamp}-$COMMIT_SHA.json\\\`;
    const filePath = path.join(process.cwd(), '.prompts', 'prompts', filename);

    session.metadata.commitSha = '$COMMIT_SHA';
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  });

  // Clean up session file
  fs.unlinkSync(sessionFile);

  console.log(\\\`✓ Captured \\\${sessions.length} session(s) for commit $COMMIT_SHA\\\`);
} else {
  console.log('ℹ No active sessions to capture for this commit');
}
" 2>/dev/null || true

exit 0
`;

  try {
    await fs.writeFile(gitHookPath, hookScript, { mode: 0o755 });
    console.log(chalk.green('✓ Git post-commit hook installed'));
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to install git hook: ${error.message}`));
  }
}

async function showClaudeSetupInstructions() {
  // Determine the gitify-prompt installation path
  const pkgRoot = path.resolve(__dirname, '..', '..');
  const wrapperPath = path.join(pkgRoot, 'dist', 'bin', 'claude-wrapper.sh');

  // Make wrapper executable
  if (await fs.pathExists(wrapperPath)) {
    await fs.chmod(wrapperPath, 0o755);
  }

  console.log(chalk.cyan('\n📝 Claude Code Integration Setup:'));
  console.log(chalk.gray('   To enable automatic prompt capture with Claude Code:\n'));

  // Detect shell
  const shell = process.env.SHELL || '';
  const shellConfigFile = shell.includes('zsh') ? '~/.zshrc' : '~/.bashrc';

  console.log(chalk.white('   1. Add this alias to your shell config:'));
  console.log(chalk.green(`      echo 'alias claude="${wrapperPath}"' >> ${shellConfigFile}`));
  console.log(chalk.gray('      # Or manually add to your shell config\n'));

  console.log(chalk.white('   2. Reload your shell:'));
  console.log(chalk.green(`      source ${shellConfigFile}\n`));

  console.log(chalk.white('   3. Use Claude normally:'));
  console.log(chalk.green('      claude "help me refactor this code"\n'));

  console.log(chalk.white('   4. Commit your changes:'));
  console.log(chalk.green('      git add .\n      git commit -m "Refactored code"\n'));

  console.log(chalk.cyan('   ✨ Your Claude conversations will be automatically captured!\n'));

  console.log(chalk.gray('   Without alias:'));
  console.log(chalk.gray(`      GITIFY_PROMPT_PATH="${pkgRoot}" ${wrapperPath}\n`));
}