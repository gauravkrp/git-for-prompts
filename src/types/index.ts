export interface PromptMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
}

export interface PromptTest {
  type: 'output' | 'contains' | 'length' | 'regex';
  description: string;
  expect?: string;
  keywords?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  flags?: string;
}

export interface Prompt {
  id: string;
  version: string;
  timestamp: string;
  lastModified: string;
  content: string;
  metadata?: PromptMetadata;
  tests?: PromptTest[];
  commitMessage?: string;
  description?: string;
}

export interface PromptData {
  content: string;
  metadata?: PromptMetadata;
  tests?: PromptTest[];
  commitMessage?: string;
  description?: string;
}

export interface HistoryEntry {
  version: string;
  timestamp: string;
  message: string;
  model?: string;
  tags?: string[];
}

export interface PromptInfo {
  id: string;
  version: string;
  lastModified: string;
  model?: string;
  tags?: string[];
  description: string;
}

export interface RunOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RunMetrics {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  time: number;
  temperature: number;
  maxTokens: number;
  model?: string;
}

export interface RunResult {
  success: boolean;
  response?: string;
  error?: string;
  metrics: RunMetrics;
  timestamp: string;
}

export interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  output?: string;
  pattern?: string;
  keywords?: string[];
  actualLength?: number;
  expectedMin?: number;
  expectedMax?: number;
  metrics?: RunMetrics;
}

export interface ComparisonResult {
  prompt1: {
    success: boolean;
    response?: string;
    metrics?: RunMetrics;
  };
  prompt2: {
    success: boolean;
    response?: string;
    metrics?: RunMetrics;
  };
  comparison: {
    lengthDiff: number;
    tokenDiff: number;
    timeDiff: number;
  };
}

export interface StoreConfig {
  version: string;
  defaultModel: string;
  testDefaults: {
    temperature: number;
    maxTokens: number;
  };
}