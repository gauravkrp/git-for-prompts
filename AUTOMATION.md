# Automation Features

Git for Prompts now includes **automatic prompt capture** for Claude Code and Cursor IDE. This eliminates the need to manually save prompts - they're captured automatically as you work!

## Overview

The automation system consists of three main components:

1. **Capture Daemon** - Background service that monitors AI tool activity
2. **Claude Code Integration** - Automatic capture for Claude Code terminal sessions
3. **Cursor Extension** - VS Code extension for Cursor IDE integration

## Quick Start

### Claude Code Terminal

The Claude Code integration automatically captures your conversations:

```bash
# 1. Initialize Git for Prompts in your project
prompt init

# 2. Start the daemon
prompt daemon start

# 3. Work normally with Claude Code
# All conversations are automatically captured

# 4. When you commit, prompts are auto-linked
git commit -m "Your commit message"
# ✓ Prompts automatically saved to .prompts/
```

### Cursor IDE

Install the Cursor extension:

```bash
cd cursor-extension
npm install
npm run compile

# In Cursor/VS Code: Install from VSIX
# or press F5 to debug
```

The extension will automatically:
- Capture Cursor AI chat sessions
- Track code changes
- Link prompts to git commits

## How It Works

### 1. Session Creation

When you start using an AI tool, a capture session is created:

```typescript
// Automatically created for you
const sessionId = daemon.createSession('claude-code', {
  cwd: process.cwd(),
  platform: process.platform
});
```

### 2. Message Capture

All messages between you and the AI are buffered:

```
User: "Refactor this function to use async/await"
Assistant: [generates code]
User: "Add error handling"
Assistant: [adds error handling]
```

### 3. Code Change Tracking

File modifications are linked to the conversation:

```typescript
daemon.addCodeChange(sessionId, 'src/auth.ts', oldContent, newContent);
```

### 4. Auto-Commit on Git Commit

When you run `git commit`, a post-commit hook:
1. Saves the entire session to `.prompts/`
2. Links it to the git commit SHA
3. Starts a new session for next changes

## Configuration

### Global Configuration

Create `~/.promptrc.json`:

```json
{
  "autoCapture": {
    "enabled": true,
    "tools": {
      "claude-code": true,
      "cursor": true,
      "chatgpt": false
    }
  },
  "privacy": {
    "excludePatterns": [
      "*.env",
      "*secret*",
      "*password*",
      "*api*key*"
    ],
    "maskSensitiveData": true
  },
  "storage": {
    "maxSessionAge": 86400000,
    "autoCleanup": true
  }
}
```

### Per-Project Configuration

Copy the example config:

```bash
cp .promptrc.example.json .promptrc.json
# Edit as needed
```

### CLI Configuration

```bash
# View current config
prompt daemon status

# Enable/disable auto-capture
prompt daemon config --enable-auto-capture true

# Enable specific tools
prompt daemon config --enable-claude-code true
prompt daemon config --enable-cursor true

# Privacy settings
prompt daemon config --mask-sensitive true
```

## Daemon Commands

### Start Daemon

```bash
prompt daemon start
```

Starts the background daemon. It will:
- Watch for AI tool activity
- Monitor file changes
- Setup git hooks
- Log activity to `/tmp/prompt-daemon.log`

### Check Status

```bash
prompt daemon status
```

Shows:
- Configuration settings
- Active capture sessions
- Privacy settings
- Tool enablement status

### Configure

```bash
prompt daemon config [options]
```

Options:
- `--enable-auto-capture <boolean>` - Toggle auto-capture
- `--enable-claude-code <boolean>` - Toggle Claude Code
- `--enable-cursor <boolean>` - Toggle Cursor
- `--enable-chatgpt <boolean>` - Toggle ChatGPT
- `--mask-sensitive <boolean>` - Toggle sensitive data masking

### Install as Service (Optional)

For always-on capture:

```bash
prompt daemon install
```

This creates a system service that runs automatically:
- **macOS**: LaunchAgent
- **Linux**: systemd service
- **Windows**: NSSM service

## Cursor Extension Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Save Prompt to Repository** - Manually save current context
- **View Prompt History** - Browse saved prompts
- **Toggle Auto-Capture** - Turn auto-capture on/off
- **Show Active Sessions** - View ongoing sessions

### Status Bar

Click the status bar item to toggle auto-capture:
- `⚫ Prompts: Off` - Disabled
- `🔴 Prompts: On` - Active and capturing

## Privacy & Security

### Sensitive Data Masking

Automatically masks:
- API keys (pattern: `*api*key*`)
- Passwords (pattern: `*password*`)
- Secrets (pattern: `*secret*`)
- Environment files (`.env`)
- SSH keys (`.pem`, `.key`)

### Exclude Patterns

Configure files to never capture:

```json
{
  "privacy": {
    "excludePatterns": [
      "*.env",
      "*secret*",
      "config/credentials.json",
      "*.pem"
    ]
  }
}
```

### Local Storage

All prompts are stored **locally** in `.prompts/`:
- No data sent to external servers
- Full control over your data
- Use `.gitignore` if needed

## Workflow Examples

### Example 1: Feature Development

```bash
# You're working on a new feature
$ prompt daemon start
✓ Daemon started

# Ask Claude Code to help
You: "Create a user authentication system with JWT"
Claude: [generates code]

# Continue iterating
You: "Add refresh tokens"
Claude: [adds refresh token logic]

# Commit when ready
$ git commit -m "Add JWT authentication with refresh tokens"
✓ Prompts captured for commit a1b2c3d

# The prompt session is now saved to .prompts/add-jwt-auth.yaml
# Linked to commit a1b2c3d
# Includes all conversation and code changes
```

### Example 2: Bug Fix

```bash
# Debugging an issue
You: "Why is this function throwing a null pointer exception?"
Claude: [analyzes code, explains issue]

You: "Fix it"
Claude: [generates fix]

# Commit the fix
$ git commit -m "Fix null pointer in getUserData"
✓ Prompts captured for commit d4e5f6g

# Later, you can review what AI suggestions led to this fix
$ prompt history fix-null-pointer
```

### Example 3: Refactoring

```bash
# Large refactor with multiple conversations
You: "Refactor this to use TypeScript"
Claude: [converts code]

You: "Add type safety"
Claude: [adds types]

You: "Extract common logic"
Claude: [creates utility functions]

# Commit when satisfied
$ git commit -m "Refactor to TypeScript with strict types"
✓ Prompts captured for commit g7h8i9j

# All three conversations are captured as one session
# Linked to the commit
```

## Advanced Usage

### Programmatic API

Use the daemon programmatically:

```typescript
import { CaptureDaemon } from 'git-for-prompts';

const daemon = new CaptureDaemon();
await daemon.start();

// Create custom session
const sessionId = daemon.createSession('generic', {
  customMeta: 'value'
});

// Add messages
daemon.addMessage(sessionId, 'user', 'Your prompt');
daemon.addMessage(sessionId, 'assistant', 'AI response');

// Add code changes
daemon.addCodeChange(sessionId, 'file.ts', oldContent, newContent);

// Save manually
const session = daemon.getSession(sessionId);
await daemon.saveSession(session, commitSha);
```

### Custom Integrations

Integrate with other AI tools:

```typescript
import { ClaudeCodeIntegration } from 'git-for-prompts';

const integration = new ClaudeCodeIntegration();
await integration.init();

// Capture user input
integration.captureUserMessage('Your prompt here');

// Capture file writes
await integration.onFileWrite('file.ts', newContent);

// Capture commits
await integration.onGitCommit(commitSha);
```

## Troubleshooting

### Daemon Not Starting

```bash
# Check if .prompts exists
ls -la .prompts

# Initialize if needed
prompt init

# Check daemon logs
tail -f /tmp/prompt-daemon.log
```

### Prompts Not Being Captured

1. Verify daemon is running: `prompt daemon status`
2. Check config: `cat ~/.promptrc.json`
3. Ensure auto-capture is enabled
4. Check for errors in logs

### Git Hook Not Working

```bash
# Check if hook exists
ls -la .git/hooks/post-commit

# Reinstall with prompt init
prompt init

# Make sure hook is executable
chmod +x .git/hooks/post-commit
```

### Cursor Extension Not Working

1. Check that `.prompts/` exists
2. Check extension status bar
3. Toggle auto-capture: `Cmd+Shift+P` → "Toggle Auto-Capture"
4. Reload Cursor: `Cmd+R` / `Ctrl+R`

## FAQ

**Q: Does this work offline?**
A: Yes! Everything is local. No internet required.

**Q: What happens if I don't want to capture a session?**
A: Stop the daemon: `prompt daemon stop`, or don't commit the code.

**Q: Can I manually edit captured prompts?**
A: Yes! They're just YAML files in `.prompts/`. Edit as needed.

**Q: Does this slow down my workflow?**
A: No. Capture happens in the background asynchronously.

**Q: What about privacy?**
A: All data stays local. Configure exclusion patterns for sensitive files.

**Q: Can I use this without git?**
A: Yes, but auto-linking to commits won't work. Use manual save.

## Next Steps

- Review captured prompts: `prompt list`
- Compare versions: `prompt diff <prompt-id>`
- Run tests: `prompt test`
- View history: `prompt history <prompt-id>`

---

**Automation makes prompt management effortless. Set it up once, capture forever!**
