import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { PromptStore } from '../lib/prompt-store.js';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export async function commitCommand(promptId, options) {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  try {
    // Get prompt content
    let content = options.content;
    if (!content) {
      content = await getPromptContent(promptId, store);
    }

    // Get commit message
    let commitMessage = options.message;
    if (!commitMessage) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Commit message:',
          default: `Update prompt ${promptId}`
        }
      ]);
      commitMessage = answers.message;
    }

    // Get metadata
    const metadata = {
      model: options.model || 'gpt-4',
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
      temperature: 0.7,
      maxTokens: 1000
    };

    // Get tests if provided
    const tests = [];
    if (options.test) {
      tests.push({
        type: 'output',
        description: options.test,
        expect: 'valid_response'
      });
    }

    // Check if this is an update
    const existingPrompt = await store.getPrompt(promptId);
    const isUpdate = !!existingPrompt;

    // Prepare prompt data
    const promptData = {
      content,
      commitMessage,
      metadata,
      tests,
      description: commitMessage
    };

    // Save the prompt
    const spinner = ora('Committing prompt...').start();
    const { version, timestamp } = await store.savePrompt(promptId, promptData);

    spinner.succeed(chalk.green(
      `${isUpdate ? 'Updated' : 'Created'} prompt "${promptId}" (version: ${version})`
    ));

    // Show summary
    console.log(chalk.gray('\nPrompt Details:'));
    console.log(chalk.gray(`  ID: ${promptId}`));
    console.log(chalk.gray(`  Version: ${version}`));
    console.log(chalk.gray(`  Model: ${metadata.model}`));
    if (metadata.tags.length > 0) {
      console.log(chalk.gray(`  Tags: ${metadata.tags.join(', ')}`));
    }
    console.log(chalk.gray(`  Timestamp: ${timestamp}`));

  } catch (error) {
    console.error(chalk.red(`Failed to commit: ${error.message}`));
    process.exit(1);
  }
}

async function getPromptContent(promptId, store) {
  // Check if prompt exists for editing
  const existingPrompt = await store.getPrompt(promptId);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'How would you like to provide the prompt content?',
      choices: [
        { name: 'Open editor', value: 'editor' },
        { name: 'Enter inline', value: 'inline' },
        { name: 'Load from file', value: 'file' }
      ]
    }
  ]);

  switch (answers.method) {
    case 'editor':
      return await openEditor(existingPrompt?.content || '');
    case 'inline':
      const { content } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'content',
          message: 'Enter prompt content:',
          default: existingPrompt?.content || ''
        }
      ]);
      return content;
    case 'file':
      const { filepath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filepath',
          message: 'Enter file path:'
        }
      ]);
      return await fs.readFile(filepath, 'utf8');
  }
}

async function openEditor(defaultContent) {
  const tmpFile = path.join(os.tmpdir(), `prompt-${Date.now()}.txt`);
  await fs.writeFile(tmpFile, defaultContent);

  const editor = process.env.EDITOR || 'vi';

  return new Promise((resolve, reject) => {
    const child = spawn(editor, [tmpFile], {
      stdio: 'inherit'
    });

    child.on('exit', async (code) => {
      if (code === 0) {
        const content = await fs.readFile(tmpFile, 'utf8');
        await fs.unlink(tmpFile);
        resolve(content);
      } else {
        reject(new Error('Editor exited with error'));
      }
    });
  });
}