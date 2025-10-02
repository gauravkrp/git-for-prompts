# API Documentation - Git for Prompts

## CLI Commands

### `prompt init`
Initialize a new prompts repository in the current directory.

**Usage:**
```bash
prompt init
```

**Creates:**
- `.prompts/` directory structure
- `config.yaml` with default settings
- Required subdirectories (prompts/, history/, outputs/)

**Example:**
```bash
$ prompt init
✓ Prompts repository initialized successfully!
```

---

### `prompt commit`
Save a new prompt or update an existing one.

**Usage:**
```bash
prompt commit <prompt-id> [options]
```

**Arguments:**
- `prompt-id` (required): Unique identifier for the prompt

**Options:**
- `-m, --message <message>`: Commit message describing the change
- `-c, --content <content>`: Prompt content (inline)
- `--model <model>`: Target LLM model (default: gpt-4)
- `--tags <tags>`: Comma-separated tags for categorization
- `--test <test>`: Test specification

**Examples:**
```bash
# Interactive mode
prompt commit email-template

# With inline content
prompt commit email-template \
  -m "Add customer email template" \
  -c "Write a friendly email to {{customer}}" \
  --model gpt-4 \
  --tags email,customer

# From file
cat template.txt | prompt commit email-template -m "Import template"
```

---

### `prompt diff`
Compare different versions of a prompt.

**Usage:**
```bash
prompt diff <prompt-id> [options]
```

**Arguments:**
- `prompt-id` (required): Prompt to compare

**Options:**
- `--from <version>`: Starting version (default: previous)
- `--to <version>`: Ending version (default: latest)
- `--output`: Include output comparison

**Examples:**
```bash
# Compare with previous version
prompt diff email-template

# Compare specific versions
prompt diff email-template --from abc123 --to def456

# Include output differences
prompt diff email-template --output
```

**Output Format:**
```diff
=== Prompt Diff ===
Prompt ID: email-template
From: abc123 (2024-01-01T10:00:00Z)
To: def456 (2024-01-01T11:00:00Z)

Content Changes:
- Old line removed
+ New line added
  Unchanged line

Metadata Changes:
- Model: gpt-3.5-turbo
+ Model: gpt-4
```

---

### `prompt history`
View the version history of a prompt.

**Usage:**
```bash
prompt history <prompt-id> [options]
```

**Arguments:**
- `prompt-id` (required): Prompt to show history for

**Options:**
- `-n, --limit <number>`: Number of versions to show (default: 10)

**Examples:**
```bash
# Show last 10 versions
prompt history email-template

# Show last 50 versions
prompt history email-template --limit 50
```

**Output Format:**
```
Prompt History: email-template
Showing last 10 commits

┌──────────┬────────────┬─────────────────────┬───────┬──────────┐
│ Version  │ Date       │ Message             │ Model │ Tags     │
├──────────┼────────────┼─────────────────────┼───────┼──────────┤
│ def456   │ 2024-01-01 │ Improve formatting  │ gpt-4 │ email    │
│ abc123   │ 2024-01-01 │ Initial template    │ gpt-4 │ email    │
└──────────┴────────────┴─────────────────────┴───────┴──────────┘
```

---

### `prompt test`
Run tests for prompts.

**Usage:**
```bash
prompt test [prompt-id] [options]
```

**Arguments:**
- `prompt-id` (optional): Specific prompt to test (tests all if omitted)

**Options:**
- `--model <model>`: Override model for testing
- `--verbose`: Show detailed output

**Examples:**
```bash
# Test specific prompt
prompt test email-template

# Test all prompts
prompt test

# Test with different model
prompt test email-template --model gpt-3.5-turbo

# Verbose output
prompt test --verbose
```

**Test Types:**

1. **Output Test**
```yaml
tests:
  - type: output
    description: Should generate valid response
```

2. **Contains Test**
```yaml
tests:
  - type: contains
    description: Should include keywords
    keywords: [welcome, hello]
```

3. **Length Test**
```yaml
tests:
  - type: length
    description: Should be concise
    min: 100
    max: 500
```

4. **Regex Test**
```yaml
tests:
  - type: regex
    description: Should match pattern
    pattern: '^Dear .+,'
    flags: i
```

---

### `prompt list`
List all prompts in the repository.

**Usage:**
```bash
prompt list [options]
```

**Options:**
- `--tags <tags>`: Filter by tags
- `--model <model>`: Filter by model

**Examples:**
```bash
# List all prompts
prompt list

# Filter by tag
prompt list --tags email

# Filter by model
prompt list --model gpt-4
```

**Output Format:**
```
Prompts Repository
Found 3 prompt(s)

┌─────────────┬─────────┬──────────┬───────┬──────┬──────────────┐
│ ID          │ Version │ Modified │ Model │ Tags │ Description  │
├─────────────┼─────────┼──────────┼───────┼──────┼──────────────┤
│ email       │ abc123  │ 2024-01  │ gpt-4 │ mail │ Email temp.. │
│ classifier  │ def456  │ 2024-01  │ gpt-4 │ ai   │ Classify...  │
└─────────────┴─────────┴──────────┴───────┴──────┴──────────────┘
```

---

## JavaScript/Node.js API

### Installation
```bash
npm install git-prompts
```

### Basic Usage

```javascript
import { PromptStore, LLMRunner } from 'git-prompts';

// Initialize store
const store = new PromptStore('.prompts');

// Initialize repository
await store.init();

// Save a prompt
const result = await store.savePrompt('my-prompt', {
  content: 'You are a helpful assistant...',
  metadata: {
    model: 'gpt-4',
    temperature: 0.7,
    tags: ['assistant', 'general']
  },
  tests: [
    { type: 'output', description: 'Should respond' }
  ],
  commitMessage: 'Add assistant prompt'
});

console.log(`Saved version: ${result.version}`);

// Get a prompt
const prompt = await store.getPrompt('my-prompt');
console.log(prompt.content);

// Get specific version
const oldPrompt = await store.getPrompt('my-prompt', 'abc123');

// List prompts
const prompts = await store.listPrompts({ tags: 'assistant' });

// Get history
const history = await store.getHistory('my-prompt', 20);
```

### Running Prompts

```javascript
const runner = new LLMRunner();

// Run a prompt
const output = await runner.runPrompt(prompt, {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000
});

if (output.success) {
  console.log('Response:', output.response);
  console.log('Tokens:', output.metrics.tokens);
  console.log('Time:', output.metrics.time);
} else {
  console.error('Error:', output.error);
}
```

### Testing Prompts

```javascript
// Run tests
const testResults = await runner.runTests(prompt, prompt.tests);

for (const result of testResults) {
  console.log(`Test: ${result.test}`);
  console.log(`Passed: ${result.passed}`);
  if (!result.passed) {
    console.log(`Error: ${result.error || 'Test failed'}`);
  }
}
```

### Comparing Outputs

```javascript
// Compare two prompt versions
const comparison = await runner.compareOutputs(
  prompt1,
  prompt2,
  { model: 'gpt-4' }
);

console.log('Length difference:', comparison.comparison.lengthDiff);
console.log('Token difference:', comparison.comparison.tokenDiff);
console.log('Time difference:', comparison.comparison.timeDiff);
```

---

## Class Reference

### PromptStore

```javascript
class PromptStore {
  constructor(basePath = '.prompts')

  // Initialize repository
  async init(): Promise<boolean>

  // Check if repository exists
  async exists(): Promise<boolean>

  // Save/update prompt
  async savePrompt(
    promptId: string,
    promptData: PromptData
  ): Promise<{ version: string, timestamp: string }>

  // Get prompt (latest or specific version)
  async getPrompt(
    promptId: string,
    version?: string
  ): Promise<Prompt | null>

  // Get version history
  async getHistory(
    promptId: string,
    limit?: number
  ): Promise<HistoryEntry[]>

  // List all prompts
  async listPrompts(
    filters?: { tags?: string, model?: string }
  ): Promise<PromptInfo[]>

  // Save test output
  async saveOutput(
    promptId: string,
    version: string,
    output: any
  ): Promise<void>

  // Get test output
  async getOutput(
    promptId: string,
    version: string
  ): Promise<any | null>
}
```

### LLMRunner

```javascript
class LLMRunner {
  constructor()

  // Run prompt against LLM
  async runPrompt(
    prompt: Prompt,
    options?: RunOptions
  ): Promise<RunResult>

  // Run test suite
  async runTests(
    prompt: Prompt,
    tests: Test[]
  ): Promise<TestResult[]>

  // Compare two prompts
  async compareOutputs(
    prompt1: Prompt,
    prompt2: Prompt,
    options?: RunOptions
  ): Promise<ComparisonResult>
}
```

---

## Data Types

### Prompt
```typescript
interface Prompt {
  id: string;
  version: string;
  timestamp: string;
  lastModified: string;
  content: string;
  metadata: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tags?: string[];
  };
  tests?: Test[];
  commitMessage?: string;
  description?: string;
}
```

### Test
```typescript
interface Test {
  type: 'output' | 'contains' | 'length' | 'regex';
  description: string;
  // Type-specific fields
  keywords?: string[];      // for 'contains'
  min?: number;             // for 'length'
  max?: number;             // for 'length'
  pattern?: string;         // for 'regex'
  flags?: string;           // for 'regex'
}
```

### RunResult
```typescript
interface RunResult {
  success: boolean;
  response?: string;
  error?: string;
  metrics: {
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    time: number;
    temperature: number;
    maxTokens: number;
    model?: string;
  };
  timestamp: string;
}
```

### TestResult
```typescript
interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  output?: string;
  metrics?: any;
}
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes (for GPT models) |
| `ANTHROPIC_API_KEY` | Anthropic API key | No (future) |
| `PROMPT_CACHE` | Enable output caching | No |
| `DEBUG` | Enable debug logging | No |

---

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `REPO_NOT_FOUND` | No .prompts directory | Run `prompt init` |
| `PROMPT_NOT_FOUND` | Prompt ID doesn't exist | Check ID with `prompt list` |
| `VERSION_NOT_FOUND` | Version doesn't exist | Check with `prompt history` |
| `API_KEY_MISSING` | No API key configured | Set in .env file |
| `MODEL_NOT_SUPPORTED` | Model not available | Check supported models |
| `TEST_FAILED` | Test didn't pass | Review test criteria |

---

## GitHub Action Configuration

```yaml
# .github/workflows/prompt-tests.yml
name: Prompt Tests

on:
  pull_request:
    paths:
      - '.prompts/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install CLI
        run: npm install -g git-prompts

      - name: Run tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: prompt test --verbose

      - name: Post results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            // Post test results as PR comment
```

---

## Integration Examples

### Express.js Server
```javascript
const express = require('express');
const { PromptStore } = require('git-prompts');

const app = express();
const store = new PromptStore();

app.get('/prompt/:id', async (req, res) => {
  const prompt = await store.getPrompt(req.params.id);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json(prompt);
});

app.listen(3000);
```

### React Component
```jsx
import { useState, useEffect } from 'react';
import { PromptStore } from 'git-prompts';

function PromptSelector({ onSelect }) {
  const [prompts, setPrompts] = useState([]);
  const store = new PromptStore();

  useEffect(() => {
    store.listPrompts().then(setPrompts);
  }, []);

  return (
    <select onChange={e => onSelect(e.target.value)}>
      {prompts.map(p => (
        <option key={p.id} value={p.id}>
          {p.id} (v{p.version})
        </option>
      ))}
    </select>
  );
}
```

### Python Integration
```python
import subprocess
import json

def get_prompt(prompt_id):
    result = subprocess.run(
        ['prompt', 'get', prompt_id, '--json'],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

prompt = get_prompt('email-template')
print(prompt['content'])
```