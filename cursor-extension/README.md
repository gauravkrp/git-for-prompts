# Gitify Prompt for VS Code & Cursor

Automatically capture and version AI conversations from Claude Code and Cursor IDE using [Gitify Prompt](https://www.npmjs.com/package/gitify-prompt).

## Features

- **Automatic Capture**: Captures Cursor AI and Claude Code chat sessions in the background
- **Git Integration**: Links conversations to Git commits automatically
- **Manual Save**: One-click manual save of prompts with full context
- **Session Viewer**: View active prompt sessions and conversation history
- **Works in Both**: Compatible with VS Code and Cursor IDE
- **Zero Configuration**: Auto-detects environment and works out of the box

## Installation

### From Source

1. Install Git for Prompts CLI:
   ```bash
   npm install -g git-for-prompts
   ```

2. Initialize in your project:
   ```bash
   cd your-project
   prompt init
   ```

3. Install the extension:
   ```bash
   cd cursor-extension
   npm install
   npm run compile
   ```

4. In VS Code/Cursor:
   - Press `F5` to launch a new window with the extension
   - Or package and install: `npm run package` then install the `.vsix` file

## Usage

### Automatic Mode (Recommended)

Once installed, the extension automatically:

1. **Captures conversations** when you interact with Cursor AI
2. **Tracks code changes** made during AI sessions
3. **Auto-commits prompts** when you make a Git commit
4. **Links everything together** via metadata

### Manual Mode

Use the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Save Prompt to Repository**: Manually save the current context
- **View Prompt History**: Browse saved prompts
- **Toggle Auto-Capture**: Turn auto-capture on/off
- **Show Active Sessions**: View ongoing prompt sessions

### Status Bar

The status bar shows capture status:
- `⚫ Prompts: Off` - Auto-capture is disabled
- `🔴 Prompts: On` - Auto-capture is active

Click the status bar item to toggle auto-capture.

## Configuration

Configure in VS Code settings (`Cmd+,` / `Ctrl+,`):

```json
{
  "cursor-prompts.autoCapture": true,
  "cursor-prompts.captureCodeChanges": true,
  "cursor-prompts.linkToGitCommits": true,
  "cursor-prompts.showNotifications": true
}
```

### Settings

- **`autoCapture`**: Automatically capture Cursor AI prompts (default: `true`)
- **`captureCodeChanges`**: Capture code changes along with prompts (default: `true`)
- **`linkToGitCommits`**: Link prompts to Git commits (default: `true`)
- **`showNotifications`**: Show notifications when prompts are captured (default: `true`)

## How It Works

1. **Session Creation**: When you start using Cursor AI, a capture session is created
2. **Message Tracking**: All conversations between you and the AI are buffered
3. **Code Tracking**: File changes are monitored and linked to the session
4. **Git Hook**: When you commit, the session is saved to `.prompts/` with commit metadata
5. **New Session**: A fresh session starts for your next round of changes

## Workflow Example

```bash
# 1. You ask Cursor AI to refactor a function
"Refactor the getUserData function to use async/await"

# 2. Cursor generates code, you accept changes

# 3. You make more changes, ask follow-up questions

# 4. When satisfied, you commit:
git add .
git commit -m "Refactor getUserData to async/await"

# ✓ Extension automatically saves the entire conversation to .prompts/
# ✓ Links it to commit SHA
# ✓ Includes all code changes
# ✓ Ready for review, testing, and version control
```

## Advanced Usage

### View Prompt Sessions

```typescript
// Access sessions programmatically
const sessions = daemon.getActiveSessions();
console.log(sessions);
```

### Custom Integration

```typescript
import { CaptureDaemon } from 'git-for-prompts';

const daemon = new CaptureDaemon();
await daemon.start();

const sessionId = daemon.createSession('cursor', {
  customMetadata: 'value'
});

daemon.addMessage(sessionId, 'user', 'Your prompt here');
```

## Privacy & Security

- Prompts are stored **locally** in `.prompts/`
- Configure `.promptrc.json` to exclude sensitive patterns
- Use `.gitignore` to prevent committing sensitive data
- Mask API keys and secrets automatically (configurable)

## Troubleshooting

### Extension Not Activating

1. Check that `.prompts/` directory exists: `ls -la .prompts`
2. Run `prompt init` if needed
3. Reload VS Code/Cursor: `Cmd+R` / `Ctrl+R`

### Prompts Not Being Captured

1. Check status bar - ensure it shows "Prompts: On"
2. Toggle auto-capture: `Cmd+Shift+P` → "Toggle Auto-Capture"
3. Check settings: `cursor-prompts.autoCapture` should be `true`

### Git Integration Not Working

1. Ensure you're in a Git repository: `git status`
2. Check that `.git/hooks/post-commit` exists
3. Run `prompt init` to reinstall hooks

## Development

### Building

```bash
npm install
npm run compile
```

### Watching

```bash
npm run watch
```

### Testing

Press `F5` in VS Code to launch the extension in debug mode.

## Contributing

Contributions welcome! Please see the main [Git for Prompts](https://github.com/your-repo/git-for-prompts) repository.

## License

MIT
