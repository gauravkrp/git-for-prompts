# Git for Prompts (PromptOps)

**Version control, review, and test LLM prompts like code.**

Git for Prompts brings software engineering best practices to prompt engineering. Version your prompts, review changes in pull requests, and run regression tests in CI/CD pipelines.

## Features

- **CLI for prompt management** - Commit, diff, and track prompt history
- **Side-by-side diff** - Compare old vs new prompt outputs
- **PR-style review workflow** - Review prompt changes before deployment
- **CI integration** - Run prompts against test suites automatically
- **Multi-model support** - Test across GPT, Claude, and local models
- **VS Code extension** - Save and test prompts directly from your editor

## Quick Start

### Installation

```bash
npm install -g git-for-prompts
```

### Initialize a prompts repository

```bash
prompt init
```

This creates a `.prompts/` directory with the following structure:
```
.prompts/
├── config.yaml       # Configuration
├── prompts/          # Current prompt versions
├── outputs/          # Generated outputs
└── history/          # Version history
```

### Add your first prompt

```bash
# Interactive mode
prompt commit user-onboarding

# With inline content
prompt commit user-onboarding \
  -m "Add onboarding email template" \
  -c "Write a friendly welcome email for new users..." \
  --model gpt-4 \
  --tags email,onboarding
```

### View prompt history

```bash
prompt history user-onboarding
```

### Compare versions

```bash
# Compare with previous version
prompt diff user-onboarding

# Compare specific versions
prompt diff user-onboarding --from abc123 --to def456

# Include output comparison
prompt diff user-onboarding --output
```

### Run tests

```bash
# Test a specific prompt
prompt test user-onboarding

# Test all prompts
prompt test

# Verbose output
prompt test --verbose
```

### List all prompts

```bash
# List all
prompt list

# Filter by tags
prompt list --tags email

# Filter by model
prompt list --model gpt-4
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

Add your API keys:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Prompt Schema

Prompts are stored as YAML files with the following structure:

```yaml
id: user-onboarding
version: abc123
timestamp: 2024-01-01T00:00:00Z
content: |
  Write a friendly welcome email...
metadata:
  model: gpt-4
  temperature: 0.7
  maxTokens: 1000
  tags:
    - email
    - onboarding
tests:
  - type: output
    description: Should generate valid response
  - type: contains
    description: Should mention key features
    keywords:
      - welcome
      - get started
  - type: length
    description: Should be concise
    min: 100
    max: 500
commitMessage: Add onboarding email template
```

## CI/CD Integration

### GitHub Actions

Add the provided workflow to `.github/workflows/prompt-tests.yml`:

```yaml
name: Prompt Tests

on:
  pull_request:
    paths:
      - '.prompts/**'

jobs:
  test-prompts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install git-prompts
        run: npm install -g git-prompts
      - name: Run tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: prompt test --verbose
```

### PR Comments

The GitHub Action automatically:
- Runs tests on prompt changes
- Posts diff comparisons as PR comments
- Shows side-by-side output differences
- Blocks merge if tests fail

## VS Code Extension

### Installation

1. Open the `vscode-extension` folder in VS Code
2. Run `npm install`
3. Press F5 to launch a new VS Code window with the extension

### Usage

- **Save Prompt**: Right-click in editor → "Save Prompt to Repository"
- **View History**: Command Palette → "View Prompt History"
- **Run Tests**: Command Palette → "Test Current Prompt"
- **Keyboard Shortcut**: `Ctrl+Shift+P, Ctrl+S` (Mac: `Cmd+Shift+P, Cmd+S`)

## Test Types

### Output Test
Validates that the prompt generates a valid response:

```yaml
tests:
  - type: output
    description: Should generate valid response
```

### Contains Test
Checks if output contains specific keywords:

```yaml
tests:
  - type: contains
    description: Should mention features
    keywords:
      - feature1
      - feature2
```

### Length Test
Validates output length constraints:

```yaml
tests:
  - type: length
    description: Should be concise
    min: 100
    max: 500
```

### Regex Test
Matches output against regex patterns:

```yaml
tests:
  - type: regex
    description: Should follow email format
    pattern: '^Subject:.*\n\nDear'
```

## Advanced Usage

### Multi-Model Testing

Test the same prompt across different models:

```bash
# Override model for testing
prompt test user-onboarding --model gpt-3.5-turbo
prompt test user-onboarding --model claude-3
```

### Batch Operations

```bash
# Test all prompts with a specific tag
for id in $(prompt list --tags email | grep -o '^[^ ]*'); do
  prompt test $id
done
```

### Export/Import

```bash
# Export all prompts
cp -r .prompts /backup/location

# Import prompts
cp -r /backup/location/.prompts .
```

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run CLI in development mode
npm run dev

# Run tests
npm test
```

### Architecture

```
src/
├── cli/              # CLI entry point
├── commands/         # Command implementations
│   ├── init.js
│   ├── commit.js
│   ├── diff.js
│   ├── history.js
│   ├── test.js
│   └── list.js
└── lib/              # Core libraries
    ├── prompt-store.js   # Storage layer
    └── llm-runner.js     # LLM integration
```

## Roadmap

- [ ] Support for Anthropic Claude models
- [ ] Local LLM support (Ollama, LMStudio)
- [ ] Web dashboard for team collaboration
- [ ] Prompt marketplace/sharing
- [ ] Advanced testing (A/B tests, regression suites)
- [ ] Prompt composition and templating
- [ ] Cost tracking and optimization
- [ ] Integration with LangChain/LangSmith
- [ ] Deterministic replay with seed support

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## License

MIT

---

**Git for Prompts** - Making prompt engineering as rigorous as software engineering.