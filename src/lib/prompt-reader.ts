import fs from 'fs-extra';
import path from 'path';

/**
 * Types for prompt data
 */
export interface PromptMetadata {
  sha: string;
  branch?: string;
  parentBranch?: string;
  author?: {
    name: string;
    email: string;
  };
  messageCount: number;
  fileCount: number;
  timestamp: string;
  filePath: string;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface FileModification {
  file: string;
  timestamp: string;
}

export interface Prompt {
  id: string;
  tool: string;
  startTime: string;
  author?: {
    name: string;
    email: string;
  };
  messages: PromptMessage[];
  filesModified: FileModification[];
  metadata: {
    commitSha?: string;
    branch?: string;
    parentBranch?: string;
    fileCount: number;
    messageCount: number;
    [key: string]: any;
  };
}

/**
 * PromptReader - Read and query prompts from .prompts/ directory
 */
export class PromptReader {
  private promptsDir: string;

  constructor(repoPath: string = process.cwd()) {
    this.promptsDir = path.join(repoPath, '.prompts', 'prompts');
  }

  /**
   * Check if .prompts directory exists
   */
  exists(): boolean {
    return fs.existsSync(this.promptsDir);
  }

  /**
   * Get all prompt files
   */
  private getPromptFiles(): string[] {
    if (!this.exists()) {
      return [];
    }

    return fs.readdirSync(this.promptsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(this.promptsDir, f));
  }

  /**
   * Read a single prompt file
   */
  private readPromptFile(filePath: string): Prompt | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read prompt file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract metadata from a prompt
   */
  private extractMetadata(prompt: Prompt, filePath: string): PromptMetadata {
    return {
      sha: prompt.metadata.commitSha || 'unknown',
      branch: prompt.metadata.branch,
      parentBranch: prompt.metadata.parentBranch,
      author: prompt.author,
      messageCount: prompt.messages?.length || 0,
      fileCount: prompt.filesModified?.length || 0,
      timestamp: prompt.startTime,
      filePath,
    };
  }

  /**
   * List all prompts with metadata
   */
  listAll(): PromptMetadata[] {
    const files = this.getPromptFiles();

    const prompts = files
      .map(file => {
        const prompt = this.readPromptFile(file);
        if (!prompt) return null;
        return this.extractMetadata(prompt, file);
      })
      .filter((p): p is PromptMetadata => p !== null);

    // Sort by timestamp (newest first)
    return prompts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get a prompt by commit SHA
   */
  getBySha(sha: string): Prompt | null {
    const files = this.getPromptFiles();

    for (const file of files) {
      const prompt = this.readPromptFile(file);
      if (prompt && prompt.metadata.commitSha === sha) {
        return prompt;
      }
      // Also check if SHA is prefix of commitSha
      if (prompt && prompt.metadata.commitSha?.startsWith(sha)) {
        return prompt;
      }
    }

    return null;
  }

  /**
   * Get prompts by branch name
   */
  getByBranch(branch: string): PromptMetadata[] {
    return this.listAll().filter(p => p.branch === branch);
  }

  /**
   * Get prompts by author name or email
   */
  getByAuthor(author: string): PromptMetadata[] {
    return this.listAll().filter(p =>
      p.author?.name === author ||
      p.author?.email === author ||
      p.author?.name?.toLowerCase().includes(author.toLowerCase())
    );
  }

  /**
   * Search prompts by text content
   */
  search(query: string): PromptMetadata[] {
    const lowerQuery = query.toLowerCase();
    const files = this.getPromptFiles();

    const matching = files
      .map(file => {
        const prompt = this.readPromptFile(file);
        if (!prompt) return null;

        // Search in messages
        const hasMatch = prompt.messages?.some(msg =>
          msg.content.toLowerCase().includes(lowerQuery)
        );

        if (hasMatch) {
          return this.extractMetadata(prompt, file);
        }

        return null;
      })
      .filter((p): p is PromptMetadata => p !== null);

    return matching.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get prompts since a given date
   */
  getSince(since: Date): PromptMetadata[] {
    const sinceTime = since.getTime();
    return this.listAll().filter(p =>
      new Date(p.timestamp).getTime() >= sinceTime
    );
  }

  /**
   * Get total count of prompts
   */
  count(): number {
    return this.getPromptFiles().length;
  }

  /**
   * Get unique branches
   */
  getBranches(): string[] {
    const branches = new Set<string>();
    this.listAll().forEach(p => {
      if (p.branch) branches.add(p.branch);
    });
    return Array.from(branches).sort();
  }

  /**
   * Get unique authors
   */
  getAuthors(): Array<{ name: string; email?: string; count: number }> {
    const authors = new Map<string, { name: string; email?: string; count: number }>();

    this.listAll().forEach(p => {
      if (p.author?.name) {
        const existing = authors.get(p.author.name);
        if (existing) {
          existing.count++;
        } else {
          authors.set(p.author.name, {
            name: p.author.name,
            email: p.author.email,
            count: 1,
          });
        }
      }
    });

    return Array.from(authors.values()).sort((a, b) => b.count - a.count);
  }
}
