import chalk from 'chalk';
import ora from 'ora';
import { PromptStore } from '../lib/prompt-store.js';

export async function initCommand(options) {
  const spinner = ora('Initializing prompts repository...').start();

  try {
    const store = new PromptStore();

    if (await store.exists()) {
      spinner.fail(chalk.red('Prompts repository already exists in this directory'));
      return;
    }

    await store.init();

    spinner.succeed(chalk.green('Prompts repository initialized successfully!'));
    console.log(chalk.gray('\nCreated structure:'));
    console.log(chalk.gray('  .prompts/'));
    console.log(chalk.gray('  ├── config.yaml'));
    console.log(chalk.gray('  ├── prompts/'));
    console.log(chalk.gray('  ├── outputs/'));
    console.log(chalk.gray('  └── history/'));
    console.log(chalk.cyan('\nRun "prompt commit <id>" to add your first prompt'));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to initialize: ${error.message}`));
    process.exit(1);
  }
}