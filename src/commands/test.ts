import chalk from 'chalk';
import ora from 'ora';
import { PromptStore } from '../lib/prompt-store.js';
import { LLMRunner } from '../lib/llm-runner.js';

export async function testCommand(promptId, options) {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  const runner = new LLMRunner();

  try {
    let promptsToTest = [];

    if (promptId) {
      // Test specific prompt
      const prompt = await store.getPrompt(promptId);
      if (!prompt) {
        console.error(chalk.red(`No prompt found with ID: ${promptId}`));
        process.exit(1);
      }
      promptsToTest.push(prompt);
    } else {
      // Test all prompts
      const allPrompts = await store.listPrompts();
      for (const promptInfo of allPrompts) {
        const prompt = await store.getPrompt(promptInfo.id);
        if (prompt) {
          promptsToTest.push(prompt);
        }
      }
    }

    if (promptsToTest.length === 0) {
      console.log(chalk.yellow('No prompts to test'));
      return;
    }

    console.log(chalk.bold.cyan(`\nRunning tests for ${promptsToTest.length} prompt(s)\n`));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const prompt of promptsToTest) {
      console.log(chalk.bold(`Testing: ${prompt.id}`));
      console.log(chalk.gray(`Version: ${prompt.version}`));
      console.log(chalk.gray(`Model: ${options.model || prompt.metadata?.model || 'gpt-4'}`));

      if (!prompt.tests || prompt.tests.length === 0) {
        // Run basic output generation test
        const spinner = ora('Generating output...').start();

        const output = await runner.runPrompt(prompt, {
          model: options.model || prompt.metadata?.model
        });

        if (output.success) {
          spinner.succeed(chalk.green('Output generated successfully'));
          if (options.verbose) {
            console.log(chalk.gray('\nOutput:'));
            console.log(chalk.dim(output.response.substring(0, 500)));
            if (output.response.length > 500) {
              console.log(chalk.dim('...'));
            }
          }
          console.log(chalk.gray(`\nMetrics:`));
          console.log(chalk.gray(`  Tokens: ${output.metrics.tokens || 'N/A'}`));
          console.log(chalk.gray(`  Time: ${output.metrics.time}ms`));

          // Save output for diff comparisons
          await store.saveOutput(prompt.id, prompt.version, output);

          totalTests++;
          totalPassed++;
        } else {
          spinner.fail(chalk.red(`Failed: ${output.error}`));
          totalTests++;
          totalFailed++;
        }
      } else {
        // Run defined tests
        console.log(chalk.gray(`Running ${prompt.tests.length} test(s)...\n`));

        const testResults = await runner.runTests(prompt, prompt.tests);

        for (const result of testResults) {
          totalTests++;
          if (result.passed) {
            totalPassed++;
            console.log(chalk.green(`  ✓ ${result.test}`));
            if (options.verbose && result.output) {
              console.log(chalk.gray(`    Output: ${result.output}`));
            }
          } else {
            totalFailed++;
            console.log(chalk.red(`  ✗ ${result.test}`));
            if (result.error) {
              console.log(chalk.red(`    Error: ${result.error}`));
            }
            if (options.verbose && result.output) {
              console.log(chalk.gray(`    Output: ${result.output}`));
            }
          }
        }
      }

      console.log(); // Empty line between prompts
    }

    // Summary
    console.log(chalk.bold.cyan('Test Summary:'));
    console.log(chalk.gray(`  Total: ${totalTests}`));
    console.log(chalk.green(`  Passed: ${totalPassed}`));
    if (totalFailed > 0) {
      console.log(chalk.red(`  Failed: ${totalFailed}`));
    }

    const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
    console.log(chalk.gray(`  Success Rate: ${successRate}%`));

    // Exit with error code if tests failed
    if (totalFailed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red(`Failed to run tests: ${error.message}`));
    console.error(chalk.gray('Make sure you have configured API keys in .env file'));
    process.exit(1);
  }
}