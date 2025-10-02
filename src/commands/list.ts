import chalk from 'chalk';
import { table } from 'table';
import { PromptStore } from '../lib/prompt-store.js';

export async function listCommand(options) {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  try {
    const filters = {
      tags: options.tags,
      model: options.model
    };

    const prompts = await store.listPrompts(filters);

    if (prompts.length === 0) {
      console.log(chalk.yellow('\nNo prompts found'));
      if (options.tags || options.model) {
        console.log(chalk.gray('Try removing filters to see all prompts'));
      } else {
        console.log(chalk.gray('Run "prompt commit <id>" to add your first prompt'));
      }
      return;
    }

    console.log(chalk.bold.cyan(`\nPrompts Repository`));
    if (options.tags || options.model) {
      console.log(chalk.gray(`Filtered by: ${options.tags ? `tags=${options.tags}` : ''} ${options.model ? `model=${options.model}` : ''}`));
    }
    console.log(chalk.gray(`Found ${prompts.length} prompt(s)\n`));

    // Prepare table data
    const tableData = [
      [
        chalk.bold('ID'),
        chalk.bold('Version'),
        chalk.bold('Last Modified'),
        chalk.bold('Model'),
        chalk.bold('Tags'),
        chalk.bold('Description')
      ]
    ];

    prompts.forEach(prompt => {
      const date = new Date(prompt.lastModified);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

      tableData.push([
        chalk.cyan(prompt.id),
        prompt.version.substring(0, 8),
        dateStr,
        prompt.model || 'N/A',
        prompt.tags ? prompt.tags.slice(0, 3).join(', ') : '',
        prompt.description.substring(0, 40)
      ]);
    });

    const config = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    };

    console.log(table(tableData, config));

    console.log(chalk.gray('\nUse "prompt history <id>" to see version history'));
    console.log(chalk.gray('Use "prompt test <id>" to run tests'));

  } catch (error) {
    console.error(chalk.red(`Failed to list prompts: ${error.message}`));
    process.exit(1);
  }
}