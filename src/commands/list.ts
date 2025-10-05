import chalk from 'chalk';
import Table from 'cli-table3';
import { formatDistanceToNow } from 'date-fns';
import { PromptReader } from '../lib/prompt-reader.js';

export interface ListOptions {
  branch?: string;
  author?: string;
  since?: string;
  limit?: number;
}

export async function listCommand(options: ListOptions) {
  const reader = new PromptReader();

  // Check if .prompts directory exists
  if (!reader.exists()) {
    console.log(chalk.yellow('No .prompts directory found in current repository.'));
    console.log(chalk.gray('Run `gitify-prompt init` to initialize.'));
    return;
  }

  // Get all prompts
  let prompts = reader.listAll();

  // Apply filters
  if (options.branch) {
    prompts = reader.getByBranch(options.branch);
    if (prompts.length === 0) {
      console.log(chalk.yellow(`No prompts found for branch: ${options.branch}`));
      return;
    }
  }

  if (options.author) {
    prompts = reader.getByAuthor(options.author);
    if (prompts.length === 0) {
      console.log(chalk.yellow(`No prompts found for author: ${options.author}`));
      return;
    }
  }

  if (options.since) {
    const sinceDate = parseDate(options.since);
    if (sinceDate) {
      prompts = reader.getSince(sinceDate);
    }
  }

  // Apply limit
  if (options.limit && options.limit > 0) {
    prompts = prompts.slice(0, options.limit);
  }

  // Check if any prompts found
  if (prompts.length === 0) {
    console.log(chalk.yellow('No prompts found.'));
    console.log(chalk.gray('Prompts are captured when you use Claude Code with the wrapper.'));
    return;
  }

  // Print summary
  console.log(chalk.cyan(`\n${prompts.length} prompt(s) found\n`));

  // Create table
  const table = new Table({
    head: [
      chalk.white.bold('SHA'),
      chalk.white.bold('Branch'),
      chalk.white.bold('Author'),
      chalk.white.bold('Messages'),
      chalk.white.bold('Files'),
      chalk.white.bold('Date'),
    ],
    colWidths: [10, 20, 15, 10, 8, 18],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  // Add rows
  prompts.forEach(prompt => {
    const sha = prompt.sha.substring(0, 7);
    const branch = truncate(prompt.branch || 'unknown', 18);
    const branchDisplay = prompt.parentBranch && prompt.branch !== prompt.parentBranch
      ? `${branch} ${chalk.gray('←')} ${chalk.gray(prompt.parentBranch)}`
      : branch;

    const author = prompt.author?.name
      ? chalk.cyan('@' + truncate(prompt.author.name, 12))
      : chalk.gray('unknown');

    const messages = chalk.yellow(prompt.messageCount.toString());
    const files = chalk.green(prompt.fileCount.toString());

    const date = formatDistanceToNow(new Date(prompt.timestamp), { addSuffix: true });

    table.push([
      chalk.gray(sha),
      branchDisplay,
      author,
      messages,
      files,
      chalk.gray(date),
    ]);
  });

  console.log(table.toString());

  // Print footer
  console.log(chalk.gray('\nUse `gitify-prompt show <sha>` to view details'));
  if (!options.branch) {
    const branches = reader.getBranches();
    if (branches.length > 1) {
      console.log(chalk.gray(`Filter by branch: --branch ${branches[0]}`));
    }
  }
  console.log();
}

/**
 * Parse a date string
 */
function parseDate(dateStr: string): Date | null {
  // Handle relative dates like "2 days ago", "1 week ago"
  const relativeMatch = dateStr.match(/^(\d+)\s+(hour|day|week|month)s?\s+ago$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    const now = new Date();

    switch (unit) {
      case 'hour':
        return new Date(now.getTime() - amount * 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Try to parse as ISO date
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
