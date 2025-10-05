import chalk from 'chalk';
import { formatDistanceToNow, format } from 'date-fns';
import { PromptReader } from '../lib/prompt-reader.js';

export interface ShowOptions {
  json?: boolean;
  files?: boolean;
}

export async function showCommand(sha: string, options: ShowOptions) {
  const reader = new PromptReader();

  // Check if .prompts directory exists
  if (!reader.exists()) {
    console.log(chalk.yellow('No .prompts directory found in current repository.'));
    console.log(chalk.gray('Run `gitify-prompt init` to initialize.'));
    return;
  }

  // Get prompt by SHA
  const prompt = reader.getBySha(sha);

  if (!prompt) {
    console.log(chalk.red(`Prompt not found for commit SHA: ${sha}`));
    console.log(chalk.gray('Use `gitify-prompt list` to see all available prompts.'));
    return;
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(prompt, null, 2));
    return;
  }

  // Pretty output
  printPromptHeader(prompt);
  printConversation(prompt);
  printFiles(prompt, options.files || false);
}

/**
 * Print prompt header with metadata
 */
function printPromptHeader(prompt: any) {
  console.log();
  console.log(chalk.bold.cyan('═'.repeat(80)));
  console.log();

  // Commit info
  const commitSha = prompt.metadata.commitSha || 'unknown';
  console.log(chalk.white.bold('Commit: ') + chalk.gray(commitSha));

  // Branch info
  if (prompt.metadata.branch) {
    const branchDisplay = prompt.metadata.parentBranch &&
                          prompt.metadata.branch !== prompt.metadata.parentBranch
      ? `${chalk.cyan(prompt.metadata.branch)} ${chalk.gray('←')} ${chalk.gray(prompt.metadata.parentBranch)}`
      : chalk.cyan(prompt.metadata.branch);
    console.log(chalk.white.bold('Branch: ') + branchDisplay);
  }

  // Author info
  if (prompt.author) {
    const authorDisplay = `${prompt.author.name} ${chalk.gray(`<${prompt.author.email}>`)}`;
    console.log(chalk.white.bold('Author: ') + authorDisplay);
  }

  // Date info
  const date = new Date(prompt.startTime);
  const dateStr = format(date, 'PPpp');
  const relativeDate = formatDistanceToNow(date, { addSuffix: true });
  console.log(chalk.white.bold('Date: ') + `${dateStr} ${chalk.gray(`(${relativeDate})`)}`);

  // Counts
  const messageCount = prompt.messages?.length || 0;
  const fileCount = prompt.filesModified?.length || 0;
  console.log(chalk.white.bold('Messages: ') + chalk.yellow(messageCount.toString()) +
              chalk.gray(' • ') +
              chalk.white.bold('Files: ') + chalk.green(fileCount.toString()));

  console.log();
  console.log(chalk.bold.cyan('═'.repeat(80)));
}

/**
 * Print conversation messages
 */
function printConversation(prompt: any) {
  console.log();
  console.log(chalk.bold.white('💬 Conversation'));
  console.log();

  if (!prompt.messages || prompt.messages.length === 0) {
    console.log(chalk.gray('  No conversation messages captured.'));
    console.log(chalk.gray('  (This might happen if the conversation wasn\'t found in Claude\'s history)'));
    console.log();
    return;
  }

  prompt.messages.forEach((msg: any, index: number) => {
    const time = format(new Date(msg.timestamp), 'HH:mm:ss');
    const isUser = msg.role === 'user';

    // Message header
    const roleIcon = isUser ? '👤' : '🤖';
    const roleName = isUser ? chalk.cyan.bold('You') : chalk.green.bold('Claude');
    console.log(`${chalk.gray(`[${time}]`)} ${roleIcon} ${roleName}:`);

    // Message content
    const content = msg.content || '';
    const lines = content.split('\n');

    lines.forEach(line => {
      if (line.trim()) {
        console.log(chalk.white('  ' + line));
      } else {
        console.log();
      }
    });

    // Add separator between messages (except last)
    if (index < prompt.messages.length - 1) {
      console.log();
    }
  });

  console.log();
  console.log(chalk.bold.cyan('─'.repeat(80)));
}

/**
 * Print modified files
 */
function printFiles(prompt: any, showContents: boolean) {
  console.log();
  console.log(chalk.bold.white(`📝 Files Modified (${prompt.filesModified?.length || 0})`));
  console.log();

  if (!prompt.filesModified || prompt.filesModified.length === 0) {
    console.log(chalk.gray('  No files were modified.'));
    console.log();
    return;
  }

  prompt.filesModified.forEach((file: any, index: number) => {
    const fileName = file.file.replace(process.cwd(), '.');
    const time = format(new Date(file.timestamp), 'HH:mm:ss');

    console.log(`${chalk.gray(`[${time}]`)} ✏️  ${chalk.cyan(fileName)}`);
  });

  console.log();

  if (!showContents) {
    console.log(chalk.gray('  Use --files to see file contents'));
    console.log();
  }

  console.log(chalk.bold.cyan('═'.repeat(80)));
  console.log();
}
