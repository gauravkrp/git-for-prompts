import chalk from 'chalk';
import * as diff from 'diff';
import { PromptStore } from '../lib/prompt-store.js';
import { LLMRunner } from '../lib/llm-runner.js';

export async function diffCommand(promptId, options) {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  try {
    // Get prompt history
    const history = await store.getHistory(promptId);
    if (history.length === 0) {
      console.error(chalk.red(`No prompt found with ID: ${promptId}`));
      process.exit(1);
    }

    // Determine versions to compare
    let fromVersion = options.from;
    let toVersion = options.to;

    if (!fromVersion && history.length >= 2) {
      fromVersion = history[1].version; // Previous version
    }
    if (!toVersion) {
      toVersion = history[0].version; // Latest version
    }

    // Get the two versions
    const fromPrompt = await store.getPrompt(promptId, fromVersion);
    const toPrompt = await store.getPrompt(promptId, toVersion);

    if (!fromPrompt || !toPrompt) {
      console.error(chalk.red('Could not find specified versions'));
      process.exit(1);
    }

    // Display header
    console.log(chalk.bold.cyan('\n=== Prompt Diff ==='));
    console.log(chalk.gray(`Prompt ID: ${promptId}`));
    console.log(chalk.gray(`From: ${fromVersion} (${fromPrompt.timestamp})`));
    console.log(chalk.gray(`To: ${toVersion} (${toPrompt.timestamp})`));
    console.log();

    // Show content diff
    console.log(chalk.bold.yellow('Content Changes:'));
    const contentDiff = diff.diffLines(
      fromPrompt.content || '',
      toPrompt.content || ''
    );

    contentDiff.forEach(part => {
      const color = part.added ? chalk.green :
                    part.removed ? chalk.red :
                    chalk.gray;
      const prefix = part.added ? '+ ' :
                    part.removed ? '- ' :
                    '  ';
      const lines = part.value.split('\n').filter(l => l);
      lines.forEach(line => {
        console.log(color(prefix + line));
      });
    });

    // Show metadata changes
    console.log(chalk.bold.yellow('\nMetadata Changes:'));
    if (fromPrompt.metadata?.model !== toPrompt.metadata?.model) {
      console.log(chalk.red(`- Model: ${fromPrompt.metadata?.model}`));
      console.log(chalk.green(`+ Model: ${toPrompt.metadata?.model}`));
    }

    const fromTags = fromPrompt.metadata?.tags || [];
    const toTags = toPrompt.metadata?.tags || [];
    if (JSON.stringify(fromTags) !== JSON.stringify(toTags)) {
      console.log(chalk.red(`- Tags: ${fromTags.join(', ')}`));
      console.log(chalk.green(`+ Tags: ${toTags.join(', ')}`));
    }

    // Show output diff if requested
    if (options.output) {
      console.log(chalk.bold.yellow('\nOutput Comparison:'));
      await showOutputDiff(store, promptId, fromVersion, toVersion);
    }

  } catch (error) {
    console.error(chalk.red(`Failed to diff: ${error.message}`));
    process.exit(1);
  }
}

async function showOutputDiff(store, promptId, fromVersion, toVersion) {
  const fromOutput = await store.getOutput(promptId, fromVersion);
  const toOutput = await store.getOutput(promptId, toVersion);

  if (!fromOutput && !toOutput) {
    console.log(chalk.gray('No outputs available for comparison'));
    return;
  }

  if (!fromOutput) {
    console.log(chalk.gray('No output for from version'));
    console.log(chalk.green(`+ Output (${toVersion}):`));
    console.log(chalk.green(toOutput.response?.substring(0, 500)));
    return;
  }

  if (!toOutput) {
    console.log(chalk.red(`- Output (${fromVersion}):`));
    console.log(chalk.red(fromOutput.response?.substring(0, 500)));
    console.log(chalk.gray('No output for to version'));
    return;
  }

  // Show side-by-side or diff
  console.log(chalk.gray('\nFrom Output:'));
  console.log(chalk.dim(fromOutput.response?.substring(0, 300) + '...'));
  console.log(chalk.gray('\nTo Output:'));
  console.log(chalk.dim(toOutput.response?.substring(0, 300) + '...'));

  // Show metrics if available
  if (fromOutput.metrics || toOutput.metrics) {
    console.log(chalk.bold.yellow('\nMetrics:'));
    console.log(chalk.gray(`Tokens: ${fromOutput.metrics?.tokens || 'N/A'} → ${toOutput.metrics?.tokens || 'N/A'}`));
    console.log(chalk.gray(`Time: ${fromOutput.metrics?.time || 'N/A'}ms → ${toOutput.metrics?.time || 'N/A'}ms`));
  }
}