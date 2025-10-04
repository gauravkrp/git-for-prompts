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
  // Check if .git directory exists
  if (!await fs.pathExists(path.join(process.cwd(), '.git'))) {
    console.log(chalk.yellow('\nWarning: Not a git repository. Git hooks will not be installed.'));
    return;
  }

  // Check if project uses Husky
  const huskyDir = path.join(process.cwd(), '.husky');
  const usesHusky = await fs.pathExists(huskyDir);

  if (usesHusky) {
    await installHuskyHooks();
  } else {
    await installStandardGitHooks();
  }
}

async function installStandardGitHooks() {
  const preCommitPath = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');
  const postCommitPath = path.join(process.cwd(), '.git', 'hooks', 'post-commit');

  const preCommitScript = `#!/bin/sh
# Gitify Prompt - Pre-commit hook
# Save sessions and add prompts to the commit

node -e "
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load all session files from .meta directory
const metaDir = path.join(process.cwd(), '.prompts', '.meta');

if (!fs.existsSync(metaDir)) {
  process.exit(0);
}

// Find all session-*.json files
const sessionFiles = fs.readdirSync(metaDir)
  .filter(f => f.startsWith('session-') && f.endsWith('.json'))
  .map(f => path.join(metaDir, f));

if (sessionFiles.length === 0) {
  process.exit(0);
}

// Save each session as a prompt (with pending SHA)
const promptsDir = path.join(process.cwd(), '.prompts', 'prompts');
if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true });
}

const promptFiles = [];
sessionFiles.forEach(sessionFile => {
  try {
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    const timestamp = Date.now();
    const filename = \\\`\\\${timestamp}-pending.json\\\`;
    const filePath = path.join(promptsDir, filename);

    session.metadata.commitSha = 'pending';
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    promptFiles.push(filePath);
  } catch (error) {
    console.error(\\\`Warning: Failed to process \\\${path.basename(sessionFile)}: \\\${error.message}\\\`);
  }
});

// Add prompt files to the staging area
if (promptFiles.length > 0) {
  try {
    execSync('git add .prompts/prompts/*-pending.json', { stdio: 'ignore' });
    console.error(\\\`[gitify-prompt] Added \\\${promptFiles.length} prompt(s) to commit\\\`);
  } catch (error) {
    console.error('[gitify-prompt] Warning: Could not add prompts to staging area');
  }
}
" 2>/dev/null || true

exit 0
`;

  const postCommitScript = `#!/bin/sh
# Gitify Prompt - Post-commit hook
# Update prompt files with actual commit SHA

COMMIT_SHA=$(git rev-parse HEAD)

node -e "
const fs = require('fs');
const path = require('path');

const promptsDir = path.join(process.cwd(), '.prompts', 'prompts');
const metaDir = path.join(process.cwd(), '.prompts', '.meta');

// Rename pending files with actual commit SHA
if (fs.existsSync(promptsDir)) {
  const pendingFiles = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('-pending.json'))
    .map(f => path.join(promptsDir, f));

  pendingFiles.forEach(pendingFile => {
    try {
      // Read and update SHA
      const content = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
      content.metadata.commitSha = '$COMMIT_SHA';

      // Create new filename with commit SHA
      const newFilename = path.basename(pendingFile).replace('-pending.json', '-$COMMIT_SHA.json');
      const newPath = path.join(promptsDir, newFilename);

      fs.writeFileSync(newPath, JSON.stringify(content, null, 2));
      fs.unlinkSync(pendingFile);
    } catch (error) {
      console.error(\\\`Warning: Failed to update \\\${path.basename(pendingFile)}\\\`);
    }
  });

  if (pendingFiles.length > 0) {
    console.log(\\\`✓ Linked \\\${pendingFiles.length} prompt(s) to commit $COMMIT_SHA\\\`);
  }
}

// Clean up session files
if (fs.existsSync(metaDir)) {
  const sessionFiles = fs.readdirSync(metaDir)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => path.join(metaDir, f));

  sessionFiles.forEach(f => {
    try {
      fs.unlinkSync(f);
    } catch (e) {}
  });
}
" 2>/dev/null || true

exit 0
`;

  try {
    await fs.writeFile(preCommitPath, preCommitScript, { mode: 0o755 });
    await fs.writeFile(postCommitPath, postCommitScript, { mode: 0o755 });
    console.log(chalk.green('✓ Git hooks installed (pre-commit + post-commit)'));
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to install git hooks: ${error.message}`));
  }
}

async function installHuskyHooks() {
  const preCommitPath = path.join(process.cwd(), '.husky', 'pre-commit');
  const postCommitPath = path.join(process.cwd(), '.husky', 'post-commit');

  // Gitify prompt hook code (without shebang, will be appended)
  const gitifyPreCommitCode = `
# Gitify Prompt - Save sessions and add prompts to commit
node -e "
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const metaDir = path.join(process.cwd(), '.prompts', '.meta');
if (!fs.existsSync(metaDir)) process.exit(0);

const sessionFiles = fs.readdirSync(metaDir)
  .filter(f => f.startsWith('session-') && f.endsWith('.json'))
  .map(f => path.join(metaDir, f));

if (sessionFiles.length === 0) process.exit(0);

const promptsDir = path.join(process.cwd(), '.prompts', 'prompts');
if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true });
}

const promptFiles = [];
sessionFiles.forEach(sessionFile => {
  try {
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    const timestamp = Date.now();
    const filename = \\\`\\\${timestamp}-pending.json\\\`;
    const filePath = path.join(promptsDir, filename);
    session.metadata.commitSha = 'pending';
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    promptFiles.push(filePath);
  } catch (error) {}
});

if (promptFiles.length > 0) {
  try {
    execSync('git add .prompts/prompts/*-pending.json', { stdio: 'ignore' });
    console.error(\\\`[gitify-prompt] Added \\\${promptFiles.length} prompt(s) to commit\\\`);
  } catch (error) {}
}
" 2>/dev/null || true
`;

  const gitifyPostCommitCode = `#!/bin/sh
# Gitify Prompt - Post-commit hook
# Update prompt files with actual commit SHA

COMMIT_SHA=$(git rev-parse HEAD)

node -e "
const fs = require('fs');
const path = require('path');

const promptsDir = path.join(process.cwd(), '.prompts', 'prompts');
const metaDir = path.join(process.cwd(), '.prompts', '.meta');

// Rename pending files with actual commit SHA
if (fs.existsSync(promptsDir)) {
  const pendingFiles = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('-pending.json'))
    .map(f => path.join(promptsDir, f));

  pendingFiles.forEach(pendingFile => {
    try {
      const content = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
      content.metadata.commitSha = '$COMMIT_SHA';

      const newFilename = path.basename(pendingFile).replace('-pending.json', '-$COMMIT_SHA.json');
      const newPath = path.join(promptsDir, newFilename);

      fs.writeFileSync(newPath, JSON.stringify(content, null, 2));
      fs.unlinkSync(pendingFile);
    } catch (error) {}
  });

  if (pendingFiles.length > 0) {
    console.log(\\\`✓ Linked \\\${pendingFiles.length} prompt(s) to commit $COMMIT_SHA\\\`);
  }
}

// Clean up session files
if (fs.existsSync(metaDir)) {
  const sessionFiles = fs.readdirSync(metaDir)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => path.join(metaDir, f));

  sessionFiles.forEach(f => {
    try { fs.unlinkSync(f); } catch (e) {}
  });
}
" 2>/dev/null || true
`;

  try {
    // Handle pre-commit (append to existing)
    if (await fs.pathExists(preCommitPath)) {
      const existingContent = await fs.readFile(preCommitPath, 'utf-8');

      // Check if gitify-prompt code already exists
      if (!existingContent.includes('# Gitify Prompt - Save sessions')) {
        await fs.writeFile(preCommitPath, existingContent + gitifyPreCommitCode);
        console.log(chalk.green('✓ Updated .husky/pre-commit hook'));
      } else {
        console.log(chalk.gray('  .husky/pre-commit already configured'));
      }
    } else {
      // Create new pre-commit hook
      await fs.writeFile(preCommitPath, '#!/bin/sh\n' + gitifyPreCommitCode, { mode: 0o755 });
      console.log(chalk.green('✓ Created .husky/pre-commit hook'));
    }

    // Handle post-commit (create or overwrite)
    await fs.writeFile(postCommitPath, gitifyPostCommitCode, { mode: 0o755 });
    console.log(chalk.green('✓ Created .husky/post-commit hook'));
  } catch (error) {
    console.log(chalk.yellow(`Warning: Failed to install Husky hooks: ${error.message}`));
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