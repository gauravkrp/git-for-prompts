# VS Code/Cursor Extension for Gitify Prompt

This extension automatically captures AI conversations from VS Code (Claude Code) and Cursor IDE, linking them to your git commits.

## Installation

### Option 1: Install from .vsix File (Recommended for Testing)

1. **Download the extension:**
   ```bash
   # The extension is located at:
   vscode-extension/gitify-prompt-vscode-0.1.0.vsix
   ```

2. **Install in VS Code or Cursor:**

   **VS Code:**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Type: `Extensions: Install from VSIX...`
   - Select `gitify-prompt-vscode-0.1.0.vsix`

   **Cursor:**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Type: `Extensions: Install from VSIX...`
   - Select `gitify-prompt-vscode-0.1.0.vsix`

   **Or use CLI:**
   ```bash
   # VS Code
   code --install-extension vscode-extension/gitify-prompt-vscode-0.1.0.vsix

   # Cursor
   cursor --install-extension vscode-extension/gitify-prompt-vscode-0.1.0.vsix
   ```

3. **Reload VS Code/Cursor**

### Option 2: Build from Source

```bash
cd vscode-extension
npm install
npm run compile
npm run package
code --install-extension gitify-prompt-vscode-0.1.0.vsix
```

## Setup

1. **Install Gitify Prompt CLI:**
   ```bash
   npm install -g gitify-prompt
   ```

2. **Initialize in your project:**
   ```bash
   cd your-project
   gitify-prompt init
   ```

3. **Start using AI in VS Code/Cursor:**
   - The extension automatically captures conversations
   - Works with Claude Code in VS Code
   - Works with Cursor AI in Cursor IDE

## Features

### Automatic Capture

The extension automatically:
- ✅ Detects whether you're in VS Code or Cursor
- ✅ Monitors AI chat conversations
- ✅ Tracks code changes made during AI sessions
- ✅ Links everything to git commits

### Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `Cursor Prompts: Save Prompt to Repository` | Manually save current context |
| `Cursor Prompts: View Prompt History` | Browse saved prompts (coming soon) |
| `Cursor Prompts: Toggle Auto-Capture` | Turn auto-capture on/off |
| `Cursor Prompts: Show Active Sessions` | View ongoing sessions |

### Status Bar

Look for the status indicator in the bottom-right:
- `⚫ Prompts: Off` - Auto-capture is disabled
- `🔴 Prompts: On` - Auto-capture is active

Click to toggle auto-capture.

## Configuration

Configure in VS Code/Cursor settings (`Cmd+,` / `Ctrl+,`):

```json
{
  "cursor-prompts.autoCapture": true,
  "cursor-prompts.captureCodeChanges": true,
  "cursor-prompts.linkToGitCommits": true,
  "cursor-prompts.showNotifications": true
}
```

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `autoCapture` | `true` | Automatically capture AI prompts |
| `captureCodeChanges` | `true` | Capture code changes with prompts |
| `linkToGitCommits` | `true` | Link prompts to git commits |
| `showNotifications` | `true` | Show capture notifications |

## How It Works

### In VS Code (with Claude Code)

1. You ask Claude Code to help with something
2. Extension captures the conversation automatically
3. When you commit, conversation is saved to `.prompts/`
4. Linked to your commit SHA

### In Cursor

1. You use Cursor AI chat
2. Extension monitors Cursor's chat storage
3. Captures conversations as they happen
4. When you commit, everything is linked together

## Workflow Example

```bash
# 1. Work with AI
# In Cursor: Open AI chat and ask: "Refactor getUserData to async/await"
# AI generates code, you accept changes

# 2. Continue working
# Make more changes, ask follow-up questions

# 3. Commit when ready
git add .
git commit -m "Refactor getUserData to async/await"

# ✓ Extension automatically:
#   - Saves entire conversation to .prompts/
#   - Links to commit SHA abc123
#   - Includes all code changes
#   - Ready for review and version control
```

## File Structure

After using the extension, your repo looks like:

```
your-project/
├── .prompts/
│   ├── config.json
│   ├── prompts/
│   │   ├── 1705315800000-abc123.json  ← Captured session
│   │   └── ...
│   └── .meta/
│       └── session-*.json             ← Active sessions
├── .git/
└── your-code/
```

## Viewing Captured Prompts

### CLI

```bash
# List all prompts
gitify-prompt list

# View specific conversation
gitify-prompt show abc123

# Generate web dashboard
gitify-prompt web --open
```

### Extension (Coming Soon)

- Built-in prompt history viewer
- Side-by-side diff view
- Timeline view of AI-assisted changes

## Troubleshooting

### Extension Not Activating

1. Check that `.prompts/` directory exists
2. Run `gitify-prompt init` if needed
3. Reload window: `Cmd+R` / `Ctrl+R`

### Prompts Not Being Captured

1. Check status bar shows "Prompts: On"
2. Toggle auto-capture: `Cmd+Shift+P` → "Toggle Auto-Capture"
3. Verify settings: `cursor-prompts.autoCapture` should be `true`

### No Conversations Showing Up

**Cursor:**
- Cursor stores chats in `~/Library/Application Support/Cursor` (macOS)
- Extension watches for changes in this directory
- If chats aren't captured, check extension logs: `View → Output → Cursor Prompts`

**VS Code with Claude Code:**
- Use the wrapper script approach (see main README)
- This extension complements the CLI tool

## Privacy & Security

- All data stored **locally** in `.prompts/`
- No data sent to external servers
- Configure `.promptignore` to exclude sensitive patterns
- Use `.gitignore` to prevent committing sensitive data

## Development

Want to contribute?

```bash
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts/vscode-extension
npm install
npm run watch  # Start watching for changes
# Press F5 in VS Code to launch extension in debug mode
```

## Publishing to Marketplace

To publish to VS Code Marketplace:

```bash
# 1. Get a publisher access token from:
# https://marketplace.visualstudio.com/manage

# 2. Login
vsce login gauravkrp

# 3. Publish
vsce publish
```

## Limitations

### Current Limitations

- **Cursor Chat API**: Cursor doesn't have a public chat API, so we monitor file system for chat data
- **Claude Code**: Requires wrapper script for full conversation capture (see main README)
- **Message Timing**: Some messages might be missed if extension starts after conversation begins

### Future Improvements

- Direct API integration with Cursor (once available)
- Better chat detection algorithms
- Real-time message streaming
- Built-in prompt history viewer
- Prompt testing framework

## Related Links

- **npm package**: https://www.npmjs.com/package/gitify-prompt
- **GitHub**: https://github.com/gauravkrp/git-for-prompts
- **VS Code Marketplace**: (coming soon)

## License

MIT

---

**Capture your AI conversations today!** Install the extension and never lose track of how your code evolved with AI assistance.
