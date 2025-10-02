import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';
import {
  Prompt,
  PromptData,
  HistoryEntry,
  PromptInfo,
  StoreConfig
} from '../types/index.js';

/**
 * PromptStore - Core storage engine for Git for Prompts
 *
 * This class manages the file-based storage of prompts, including:
 * - Version control and history tracking
 * - YAML serialization/deserialization
 * - Output snapshot storage for testing
 * - Index management for fast lookups
 *
 * @class PromptStore
 */
export class PromptStore {
  private basePath: string;
  private metaPath: string;

  /**
   * Creates a new PromptStore instance
   * @param basePath - Base directory for prompt storage (default: '.prompts')
   */
  constructor(basePath: string = '.prompts') {
    this.basePath = basePath;
    this.metaPath = path.join(basePath, '.meta');
  }

  /**
   * Initializes a new prompt repository
   * Creates the directory structure and default configuration
   * @returns Success status
   */
  async init(): Promise<boolean> {
    await fs.ensureDir(this.basePath);
    await fs.ensureDir(this.metaPath);
    await fs.ensureDir(path.join(this.basePath, 'prompts'));
    await fs.ensureDir(path.join(this.basePath, 'outputs'));
    await fs.ensureDir(path.join(this.basePath, 'history'));

    const configPath = path.join(this.basePath, 'config.yaml');
    if (!await fs.pathExists(configPath)) {
      await fs.writeFile(configPath, yaml.dump({
        version: '1.0',
        defaultModel: 'gpt-4',
        testDefaults: {
          temperature: 0.7,
          maxTokens: 1000
        }
      }));
    }
    return true;
  }

  async exists(): Promise<boolean> {
    return await fs.pathExists(this.basePath);
  }

  async savePrompt(promptId: string, promptData: PromptData): Promise<{ version: string; timestamp: string }> {
    const timestamp = new Date().toISOString();
    const version = crypto.randomBytes(4).toString('hex');

    // Save the main prompt file
    const promptPath = path.join(this.basePath, 'prompts', `${promptId}.yaml`);
    const historyPath = path.join(this.basePath, 'history', promptId, `${timestamp}-${version}.yaml`);

    // Ensure history directory exists
    await fs.ensureDir(path.join(this.basePath, 'history', promptId));

    // Add metadata
    const fullData = {
      ...promptData,
      id: promptId,
      version,
      timestamp,
      lastModified: timestamp
    };

    // Save to both current and history
    await fs.writeFile(promptPath, yaml.dump(fullData));
    await fs.writeFile(historyPath, yaml.dump(fullData));

    // Update index
    await this.updateIndex(promptId, fullData);

    return { version, timestamp };
  }

  async getPrompt(promptId: string, version: string | null = null): Promise<any> {
    if (!version) {
      // Get latest version
      const promptPath = path.join(this.basePath, 'prompts', `${promptId}.yaml`);
      if (!await fs.pathExists(promptPath)) {
        return null;
      }
      const content = await fs.readFile(promptPath, 'utf8');
      return yaml.load(content);
    } else {
      // Get specific version from history
      const historyDir = path.join(this.basePath, 'history', promptId);
      const files = await fs.readdir(historyDir);
      const versionFile = files.find(f => f.includes(version));
      if (!versionFile) {
        return null;
      }
      const content = await fs.readFile(path.join(historyDir, versionFile), 'utf8');
      return yaml.load(content);
    }
  }

  async getHistory(promptId: string, limit: number = 10): Promise<any[]> {
    const historyDir = path.join(this.basePath, 'history', promptId);
    if (!await fs.pathExists(historyDir)) {
      return [];
    }

    const files = await fs.readdir(historyDir);
    const history = [];

    // Sort by timestamp (newest first)
    const sortedFiles = files.sort().reverse().slice(0, limit);

    for (const file of sortedFiles) {
      const content = await fs.readFile(path.join(historyDir, file), 'utf8');
      const data: any = yaml.load(content);
      history.push({
        version: data.version,
        timestamp: data.timestamp,
        message: data.commitMessage || 'No message',
        model: data.metadata?.model,
        tags: data.metadata?.tags
      });
    }

    return history;
  }

  async listPrompts(filters: any = {}): Promise<any[]> {
    const promptsDir = path.join(this.basePath, 'prompts');
    if (!await fs.pathExists(promptsDir)) {
      return [];
    }

    const files = await fs.readdir(promptsDir);
    const prompts = [];

    for (const file of files) {
      if (path.extname(file) === '.yaml') {
        const content = await fs.readFile(path.join(promptsDir, file), 'utf8');
        const data: any = yaml.load(content);

        // Apply filters
        if (filters.tags && data.metadata?.tags) {
          const filterTags = filters.tags.split(',');
          const promptTags = data.metadata.tags;
          if (!filterTags.some(tag => promptTags.includes(tag))) {
            continue;
          }
        }

        if (filters.model && data.metadata?.model !== filters.model) {
          continue;
        }

        prompts.push({
          id: data.id,
          version: data.version,
          lastModified: data.lastModified,
          model: data.metadata?.model,
          tags: data.metadata?.tags,
          description: data.description || data.content?.substring(0, 50) + '...'
        });
      }
    }

    return prompts;
  }

  async updateIndex(promptId: string, data: any): Promise<void> {
    const indexPath = path.join(this.metaPath, 'index.json');
    let index = {};

    if (await fs.pathExists(indexPath)) {
      index = await fs.readJson(indexPath);
    }

    index[promptId] = {
      lastVersion: data.version,
      lastModified: data.timestamp,
      model: data.metadata?.model,
      tags: data.metadata?.tags
    };

    await fs.writeJson(indexPath, index, { spaces: 2 });
  }

  async saveOutput(promptId: string, version: string, output: any): Promise<void> {
    const outputPath = path.join(
      this.basePath,
      'outputs',
      promptId,
      `${version}.json`
    );
    await fs.ensureDir(path.join(this.basePath, 'outputs', promptId));
    await fs.writeJson(outputPath, output, { spaces: 2 });
  }

  async getOutput(promptId: string, version: string): Promise<any> {
    const outputPath = path.join(
      this.basePath,
      'outputs',
      promptId,
      `${version}.json`
    );
    if (!await fs.pathExists(outputPath)) {
      return null;
    }
    return await fs.readJson(outputPath);
  }
}