# Gitify Prompt

**Automatic conversation capture for Claude Code** - Track your AI-assisted coding sessions with zero manual effort.

## What It Does

Automatically captures your Claude Code conversations and links them to git commits, giving you a complete history of how your code evolved with AI assistance.

## Features

- 🤖 **Zero-Effort Capture** - Conversations automatically saved as you code
- 💬 **Full Conversations** - Captures your prompts AND Claude's responses
- 📋 **Pasted Content** - Preserves screenshots, code snippets, error messages you paste
- 🔗 **Git Integration** - Links conversations to commits automatically
- 👤 **Git Author Tracking** - Records who had the conversation
- 🚀 **Real-Time Sync** - Sessions saved immediately, not on exit
- 🔄 **Multi-Session Support** - Run multiple Claude instances, capture all of them
- 🛠️ **Any Commit Tool** - Works with GitHub Desktop, VS Code, Terminal, or even Claude itself
- 📊 **CLI Dashboard** - List, search, and filter prompts from terminal
- 🌐 **Web Dashboard** - Beautiful static HTML dashboard with search and filters
- 🌿 **Branch Tracking** - See which branch each conversation happened on

## Quick Start

### 1. Installation

```bash
npm install -g gitify-prompt
```

### 2. Set Up Wrapper Alias

```bash
# Add to ~/.zshrc or ~/.bashrc:
echo 'alias claude="/path/to/gitify-prompt/dist/bin/claude-wrapper.sh"' >> ~/.zshrc
source ~/.zshrc
```

**Or run without alias:**
```bash
/path/to/claude-wrapper.sh "your prompt"
```

### 3. Initialize Your Project

```bash
cd your-project
gitify-prompt init
```

This creates:
- `.prompts/` directory
- Git hooks (automatically detects Husky!)

### 4. Use Claude Normally

```bash
claude "add error handling to src/api.ts"
# Conversation captured automatically ✓
```

### 5. Commit Your Changes

```bash
git add .
git commit -m "Add error handling"
# ✓ Conversation linked to commit automatically!
```

## How It Works

### Architecture

```
┌────────────────────────────────────────┐
│ Your Shell: claude "add feature"      │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│ claude-wrapper.sh                      │
│  Sets: NODE_OPTIONS=--import hook.js   │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│ Claude Code (with hook loaded)        │
│  - Intercepts file writes             │
│  - Reads ~/.claude/projects/*.jsonl   │
│  - Saves to .prompts/.meta/session-*.json │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│ git commit                             │
│  Pre-commit: Add prompts to commit     │
│  Post-commit: Link to commit SHA       │
└────────────────────────────────────────┘
```

### Conversation Capture

The hook reads from `~/.claude/projects/` where Claude Code stores conversations:

```
~/.claude/projects/
└── -Users-you-dev-project/
    ├── abc123-xyz.jsonl   ← Your conversations
    ├── def456-uvw.jsonl
    └── ...
```

Each JSONL file contains:
- User messages (your prompts)
- Assistant messages (Claude's responses)
- Tool uses (code executions)
- Timestamps
- Pasted content (inline)

### Session Matching

Sessions are matched to conversations using:
1. **Timestamp** - Only messages after session start
2. **Project path** - Only conversations from this repo
3. **Best fit** - Picks conversation with most matching messages

### What Gets Saved

```json
{
  "id": "session-abc123",
  "tool": "claude-code",
  "startTime": "2025-01-15T10:30:00Z",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "messages": [
    {
      "role": "user",
      "content": "add error handling to src/api.ts",
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "I'll add comprehensive error handling...",
      "timestamp": "2025-01-15T10:30:05Z"
    }
  ],
  "filesModified": [
    {
      "file": "/path/to/project/src/api.ts",
      "timestamp": "2025-01-15T10:30:10Z"
    }
  ],
  "metadata": {
    "commitSha": "abc123def",
    "branch": "feature-auth",
    "parentBranch": "main",
    "fileCount": 1,
    "messageCount": 2
  }
}
```

## Features in Detail

### ✅ Real-Time Session Saving

Sessions are saved **immediately** when files are modified, not when Claude exits. This means:
- ✅ Works even if Claude is still running when you commit
- ✅ Captures sessions even if Claude crashes
- ✅ No dependency on process lifecycle

### ✅ Pasted Content Included

When you paste error messages, screenshots, or code into Claude:
```
You: [Pasted text #1 +150 lines] fix this error
```

The **full 150 lines** are captured, not just the summary.

### ✅ Multi-Session Support

Run Claude in 3 terminal tabs:
```bash
# Tab 1: claude "fix bug A"
# Tab 2: claude "add feature B"
# Tab 3: claude "refactor C"
```

Commit once → **All 3 conversations captured!**

### ✅ Works with Any Commit Tool

- ✅ Terminal: `git commit`
- ✅ GitHub Desktop
- ✅ VS Code Source Control
- ✅ Claude itself: `claude "commit these changes"`

All trigger the same hooks → consistent behavior.

### ✅ Husky Integration

Automatically detects if your project uses Husky:

**Standard Git:**
```
.git/hooks/
├── pre-commit   ← Created by gitify-prompt
└── post-commit  ← Created by gitify-prompt
```

**Husky Project:**
```
.husky/
├── pre-commit   ← Appended (preserves lint-staged!)
└── post-commit  ← Created by gitify-prompt
```

## Repository Structure

```
your-project/
├── .prompts/
│   ├── config.json
│   ├── prompts/
│   │   ├── 1705315800000-abc123.json  ← Captured session
│   │   ├── 1705402200000-def456.json
│   │   └── ...
│   └── .meta/
│       └── (temporary session files)
└── .git/
    └── hooks/
        ├── pre-commit
        └── post-commit
```

## Capture Methods

Gitify Prompt supports two ways to capture AI conversations:

### Method 1: Claude Code Wrapper (Recommended)

**How it works:**
- Uses `claude-wrapper.sh` to wrap the `claude` command
- Loads a hook module via `NODE_OPTIONS` that runs in the same process
- Reads conversations from `~/.claude/projects/*.jsonl` files
- Matches conversations based on timestamp + project path

**Pros:**
- ✅ **Most reliable** - Direct access to Claude Code's conversation storage
- ✅ **Perfect matching** - Uses timestamp and path to find exact conversation
- ✅ **Full fidelity** - Captures complete message history including pasted content
- ✅ **Works today** - Uses documented Claude Code storage format

**Setup:**
```bash
# Add alias to ~/.zshrc or ~/.bashrc
alias claude="/path/to/node_modules/gitify-prompt/bin/claude-wrapper.sh"

# Use normally
claude "add error handling"
```

**Matching Logic:**
1. Matches conversations with timestamps after session start (±1 minute buffer)
2. Confirms project path matches current directory
3. Picks conversation with most messages in timeframe
4. See src/lib/claude-hook.ts:198-283

### Method 2: VS Code/Cursor Extension (Experimental)

**How it works:**
- VS Code extension that monitors Cursor's workspace storage
- Reads chat history from SQLite databases (`state.vscdb` files)
- Watches for database changes and extracts messages

**Location:** `~/Library/Application Support/Cursor/User/workspaceStorage/<workspace-id>/state.vscdb`

**Pros:**
- ✅ **No wrapper needed** - Works directly in Cursor IDE
- ✅ **Native integration** - Status bar, commands, notifications

**Cons:**
- ⚠️ **Undocumented schema** - Cursor's database structure is not officially documented
- ⚠️ **Duplicate risk** - Currently captures all messages, may duplicate old conversations
- ⚠️ **No active chat detection** - Can't reliably identify which "tab" is active
- ⚠️ **Work in progress** - Needs improvement for production use

**Known Limitations:**
- Background Agent chats are stored remotely (not captured)
- Database schema exploration is speculative
- No deduplication logic yet (see vscode-extension/src/extension.ts:447-517)

**Recommendation:** Use Claude Code wrapper for production. Use Cursor extension for experimentation only.

## Commands

### `gitify-prompt init`
Initialize `.prompts/` directory and install git hooks.

```bash
cd your-project
gitify-prompt init
```

**Options:**
- Detects Husky automatically
- Preserves existing hooks
- Safe to run multiple times

### `gitify-prompt list`
List all captured prompts with metadata.

```bash
gitify-prompt list
gitify-prompt list --branch feature-auth
gitify-prompt list --author "Your Name"
gitify-prompt list --since "2 days ago"
gitify-prompt list --limit 10
```

**Output:**
```
┌──────────┬────────────────┬───────────────┬──────────┬────────┬──────────────────┐
│ SHA      │ Branch         │ Author        │ Messages │ Files  │ Date             │
├──────────┼────────────────┼───────────────┼──────────┼────────┼──────────────────┤
│ abc123d  │ feature-auth   │ @Your Name    │ 3        │ 5      │ 2 hours ago      │
│ def456g  │ main           │ @Your Name    │ 7        │ 2      │ 5 hours ago      │
└──────────┴────────────────┴───────────────┴──────────┴────────┴──────────────────┘
```

### `gitify-prompt show <sha>`
View full conversation and changes for a specific commit.

```bash
gitify-prompt show abc123
gitify-prompt show abc123 --json
gitify-prompt show abc123 --files
```

**Output:**
```
Commit: abc123def456
Branch: feature-auth ← main
Author: Your Name <you@example.com>
Date: Jan 15, 2025, 10:30:00 AM (2 hours ago)
Messages: 3 • Files: 5

💬 Conversation

[10:30:00] 👤 You:
  add error handling to src/api.ts

[10:30:05] 🤖 Claude:
  I'll add comprehensive error handling...

📝 Files Modified (5)

✏️  src/api.ts
✏️  src/types.ts
...
```

### `gitify-prompt web`
Generate a static HTML dashboard to visualize your prompts.

```bash
gitify-prompt web
gitify-prompt web --open  # Open in browser after generation
```

**Features:**
- 🔍 Search prompts
- 🔄 Filter by branch/author
- 💬 View full conversations
- 📱 Responsive design
- 🌐 Works offline (no backend needed)
- 📦 Commit to git for GitHub Pages

**Output:**
```
.prompts/web/
├── index.html        # Prompt list dashboard
├── prompts/          # Individual prompt pages
├── assets/           # CSS and JavaScript
└── data.json         # All prompts as JSON
```

## Configuration

Edit `.prompts/config.yaml`:

```yaml
autoCapture:
  enabled: true
  tools:
    claudeCode: true
    # cursor: false (future)
    # chatgpt: false (future)

privacy:
  maskSensitiveData: true
  excludePatterns:
    - "*.env"
    - "*secret*"
    - "*password*"
    - "*api*key*"
```

## Troubleshooting

### Prompts Not Captured?

**1. Check hook is loaded:**
```bash
claude --version
# Look for: [gitify-prompt] Capturing session ...
```

**2. Check wrapper alias:**
```bash
which claude
# Should show: ...claude-wrapper.sh
```

**3. Check git hooks installed:**
```bash
cat .git/hooks/pre-commit | grep gitify-prompt
# or for Husky:
cat .husky/pre-commit | grep gitify-prompt
```

**4. Check session files exist:**
```bash
ls -la .prompts/.meta/
# Should show session-*.json when Claude is running
```

**5. Re-initialize:**
```bash
gitify-prompt init
```

### No Conversation in Captured Prompts?

Check if Claude Code is storing conversations:
```bash
ls -la ~/.claude/projects/
# Should see directory for your project
```

If not, Claude Code might not be saving conversations. This is a Claude Code issue, not gitify-prompt.

## Privacy & Security

- **Local Only** - All data stays on your machine
- **No Network** - No remote connections
- **No Telemetry** - No tracking or analytics
- **Git Control** - You decide what gets committed
- **Sensitive Data Masking** - Auto-filters passwords, API keys (config)

## Requirements

- Node.js 18.19+ (for `--import` flag)
- Git
- Claude Code
- macOS or Linux (Windows untested)

## Known Limitations

1. **Claude Code only** (Cursor, ChatGPT not supported yet)
2. **Requires wrapper setup** (alias configuration)
3. **No retroactive capture** (only active sessions)
4. **Windows untested** (path encoding might differ)

## Development

```bash
# Clone and install
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-prompts
npm install

# Build
npm run build

# Link globally
npm link

# Test
cd /path/to/test/project
gitify-prompt init
claude "test prompt"
```

## How This Differs from Manual Annotation

**Before (Manual):**
```bash
claude "add feature"
# ... work ...
gitify-prompt annotate -m "I asked Claude to add feature X"
git commit -m "Add feature"
```

**Now (Automatic):**
```bash
claude "add feature"  # ← Conversation captured automatically
git commit -m "Add feature"  # ← Linked automatically
```

**Zero extra steps!**

## Development

### Publishing New Versions

This package uses automated publishing via GitHub Actions. When you push a version change to `main`, it automatically publishes to npm.

**Quick version bump:**
```bash
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

git push && git push --tags
```

This triggers the GitHub Actions workflow which:
1. Detects version change
2. Runs build and tests
3. Publishes to npm
4. Creates GitHub release

See [AUTO-PUBLISH.md](AUTO-PUBLISH.md) for setup instructions.

### Local Development

```bash
# Clone the repo
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts

# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test locally
./dist/cli/index.js --help
```

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon).

**Areas needing help:**
- Windows support
- Cursor IDE integration
- ChatGPT integration
- Automated tests
- Performance optimization

## Related Projects

- [Claude Code](https://claude.com/claude-code) - The AI coding assistant
- [Cursor](https://cursor.sh) - AI-first code editor
- [Aider](https://aider.chat) - AI pair programming

## License

MIT

---

**Start capturing your Claude conversations today!**

```bash
npm install -g gitify-prompt
cd your-project
gitify-prompt init
# Add wrapper alias (see Quick Start)
claude "your first prompt"
git add . && git commit -m "First captured session!"
```

