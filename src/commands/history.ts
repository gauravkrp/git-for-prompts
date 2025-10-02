import chalk from 'chalk';
import { table } from 'table';
import { PromptStore } from '../lib/prompt-store.js';

export async function historyCommand(promptId, options) {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  try {
    const limit = parseInt(options.limit) || 10;
    const history = await store.getHistory(promptId, limit);

    if (history.length === 0) {
      console.error(chalk.red(`No prompt found with ID: ${promptId}`));
      process.exit(1);
    }

    console.log(chalk.bold.cyan(`\nPrompt History: ${promptId}`));
    console.log(chalk.gray(`Showing last ${history.length} commits\n`));

    // Prepare table data
    const tableData = [
      [
        chalk.bold('Version'),
        chalk.bold('Date'),
        chalk.bold('Message'),
        chalk.bold('Model'),
        chalk.bold('Tags')
      ]
    ];

    history.forEach((commit, index) => {
      const date = new Date(commit.timestamp);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

      tableData.push([
        index === 0 ? chalk.green(commit.version) + chalk.green(' (latest)') : commit.version,
        dateStr,
        commit.message.substring(0, 40) + (commit.message.length > 40 ? '...' : ''),
        commit.model || 'N/A',
        commit.tags ? commit.tags.slice(0, 3).join(', ') : ''
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

    console.log(chalk.gray('\nUse "prompt diff <prompt-id> --from <version> --to <version>" to compare versions'));

  } catch (error) {
    console.error(chalk.red(`Failed to get history: ${error.message}`));
    process.exit(1);
  }
}