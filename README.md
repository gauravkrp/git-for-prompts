# Gitify Prompt

**Version control for LLM prompts** - Automatically capture and track your Claude Code conversations linked to git commits.

## Features

- 🤖 **Auto-Capture for Claude Code** - Automatically captures prompts when you use `claude` command
- 🔗 **Git Integration** - Prompts automatically saved and linked to your git commits
- 📝 **Version Control** - Track prompt changes over time
- 🧪 **Testing Framework** - Define and run tests to validate prompts
- 📊 **Diff & History** - Compare prompt versions and view evolution
- 🔍 **Search & Filter** - Find prompts by tags, models, or content

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/git-prompts.git
cd git-prompts

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link

# Verify installation
gitify-prompt --version
```

## Quick Start

### 1. Initialize Your Project

```bash
cd your-project
gitify-prompt init
```

This creates:
- `.prompts/` directory for storing prompts
- `.git/hooks/post-commit` git hook for auto-capture

### 2. Start Using Claude Code

```bash
# Just use Claude normally
claude

# The integration starts automatically!
# Your conversation is captured as you work
```

### 3. Make Changes and Commit

```bash
# Make your code changes
# ... work with Claude ...

# Commit your changes
git add .
git commit -m "Add new feature"

# ✓ Prompts automatically captured and linked to this commit!
```

## How It Works

### Automatic Capture

When you run the `claude` command:

1. **In-Process Daemon**: A capture daemon starts in the same terminal process
2. **Session Tracking**: Creates a session tagged with your repository path
3. **Auto-Tagging**: All sessions are tagged with `repoPath` for multi-repo support
4. **Git Hook Integration**: On commit, the post-commit hook saves all prompts for your repo

### Multi-Repository Support

Gitify Prompt automatically handles multiple repositories:

- Each session is tagged with `repoPath`
- Git commits only save prompts for the current repository
- Works seamlessly across different projects

### Repository Structure

```
your-project/
├── .prompts/
│   ├── config.json          # Configuration
│   ├── prompts/             # Captured prompt files
│   │   ├── <timestamp>-<sha>.json
│   │   └── ...
│   └── tests/               # Test specifications
└── .git/
    └── hooks/
        └── post-commit      # Auto-capture hook
```

### Prompt Format

Each captured prompt includes:

```json
{
  "id": "session-id",
  "timestamp": "2024-01-15T10:30:00Z",
  "tool": "claude-code",
  "metadata": {
    "commitSha": "abc123",
    "repoPath": "/path/to/your/repo",
    "cwd": "/path/to/your/repo",
    "platform": "darwin"
  },
  "conversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "code_changes": [
    {
      "file": "src/index.ts",
      "before": "old content",
      "after": "new content"
    }
  ]
}
```

## Manual Prompt Management

You can also manually manage prompts:

```bash
# Create a prompt
gitify-prompt commit my-prompt \
  -c "Write a function to..." \
  -m "Initial version" \
  --model claude-3-opus \
  --tags feature,bugfix

# View prompt history
gitify-prompt history my-prompt

# Compare versions
gitify-prompt diff my-prompt --from v1 --to v2

# List all prompts
gitify-prompt list
gitify-prompt list --tags feature
gitify-prompt list --model claude-3

# Run tests
gitify-prompt test my-prompt
gitify-prompt test --verbose
```

## Configuration

Edit `.prompts/config.json`:

```json
{
  "autoCapture": {
    "enabled": true,
    "tools": {
      "claudeCode": true,
      "cursor": false,
      "chatgpt": false
    }
  },
  "privacy": {
    "maskSensitiveData": true,
    "excludePatterns": [
      "*.env",
      "*secret*",
      "*password*",
      "*api*key*"
    ]
  }
}
```

## Testing Prompts

Define tests to validate prompt behavior:

```yaml
# .prompts/prompts/my-prompt.yaml
id: my-prompt
content: |
  Write a function to...
tests:
  - type: output
    description: Should generate valid response
  - type: contains
    description: Should mention key concepts
    keywords:
      - function
      - parameter
  - type: length
    description: Should be concise
    min: 100
    max: 500
```

Run tests:

```bash
gitify-prompt test my-prompt --verbose
```

## Programmatic API

```typescript
import { CaptureDaemon, ClaudeCodeIntegration } from 'gitify-prompt';

// Use Claude Code integration
import { claudeCodeIntegration } from 'gitify-prompt';
await claudeCodeIntegration.init();

// Or use CaptureDaemon directly
const daemon = new CaptureDaemon();
await daemon.start();

const sessionId = daemon.createSession('my-tool', {
  repoPath: process.cwd()
});

daemon.addMessage(sessionId, 'user', 'Hello!');
daemon.addMessage(sessionId, 'assistant', 'Hi there!');

const session = daemon.getSession(sessionId);
await daemon.saveSession(session, 'commit-sha');
```

## Commands Reference

### `gitify-prompt init`
Initialize a prompt repository in the current directory.

### `gitify-prompt commit <prompt-id>`
Commit a new prompt or update an existing one.

### `gitify-prompt list [options]`
List all prompts. Filter by `--tags` or `--model`.

### `gitify-prompt history <prompt-id> [options]`
Show commit history. Use `-n` to limit results.

### `gitify-prompt diff <prompt-id> [options]`
Compare versions. Use `--from` and `--to` for specific versions.

### `gitify-prompt test [prompt-id] [options]`
Run tests. Use `--verbose` for detailed output.

## Use Cases

### 1. Track Prompt Evolution
```bash
gitify-prompt history "sql-generator"
gitify-prompt diff "sql-generator" --from v1 --to v3
```

### 2. Team Collaboration
```bash
git add .prompts/
git commit -m "Improve data extraction prompt"
git push
```

### 3. Automated Capture Workflow
```bash
# Just use Claude - everything is automatic!
claude
# ... work ...
git commit -m "Feature complete"
# Prompts auto-captured!
```

## Troubleshooting

### Prompts Not Being Captured

1. Make sure you initialized: `gitify-prompt init`
2. Check the git hook exists: `cat .git/hooks/post-commit`
3. Verify config: `cat .prompts/config.json`
4. Check that `autoCapture.enabled` is `true`

### Re-initialize

```bash
gitify-prompt init
```

This recreates the `.prompts/` directory and git hooks.

## Privacy & Security

- **Sensitive Data Masking**: Automatically masks passwords, API keys, etc.
- **Exclude Patterns**: Configure files/patterns to never capture
- **Local Storage**: All prompts stored locally in `.prompts/`
- **Repository Isolation**: Each repo's sessions are kept separate

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local development
npm link
```

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

---

**Start capturing your Claude Code prompts today!**

```bash
cd your-project
gitify-prompt init
claude
```
