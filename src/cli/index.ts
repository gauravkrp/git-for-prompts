#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { commitCommand } from '../commands/commit.js';
import { diffCommand } from '../commands/diff.js';
import { historyCommand } from '../commands/history.js';
import { testCommand } from '../commands/test.js';
import { initCommand } from '../commands/init.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';
import { webCommand } from '../commands/web.js';

const program = new Command();

program
  .name('gitify-prompt')
  .description('Gitify Prompt - Version control, review, and test LLM prompts')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a prompts repository in the current directory')
  .action(initCommand);

program
  .command('commit <prompt-id>')
  .description('Commit a new prompt or update an existing one')
  .option('-m, --message <message>', 'Commit message')
  .option('-c, --content <content>', 'Prompt content (or use editor)')
  .option('--model <model>', 'Target model (e.g., gpt-4, claude-3)')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--test <test>', 'Test specification')
  .action(commitCommand);

program
  .command('diff <prompt-id>')
  .description('Show differences between prompt versions')
  .option('--from <version>', 'Compare from this version')
  .option('--to <version>', 'Compare to this version (default: latest)')
  .option('--output', 'Include output differences')
  .action(diffCommand);

program
  .command('history <prompt-id>')
  .description('Show commit history for a prompt')
  .option('-n, --limit <number>', 'Limit number of commits shown', '10')
  .action(historyCommand);

program
  .command('test [prompt-id]')
  .description('Run tests for a prompt or all prompts')
  .option('--model <model>', 'Override model for testing')
  .option('--verbose', 'Show detailed test output')
  .action(testCommand);

program
  .command('list')
  .description('List all captured prompts')
  .option('--branch <branch>', 'Filter by branch')
  .option('--author <author>', 'Filter by author')
  .option('--since <date>', 'Show prompts since date (e.g., "2 days ago")')
  .option('--limit <number>', 'Limit number of results')
  .action(listCommand);

program
  .command('show <sha>')
  .description('Show details of a specific prompt')
  .option('--json', 'Output as JSON')
  .option('--files', 'Show file contents')
  .action(showCommand);

program
  .command('web')
  .description('Generate static HTML dashboard')
  .option('--open', 'Open in browser after generation')
  .option('--output <path>', 'Output directory (default: .prompts/web)')
  .action(webCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}