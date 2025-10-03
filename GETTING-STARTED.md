# Getting Started with Git for Prompts

This guide will help you set up automatic prompt capture for your AI-powered development workflow.

## Prerequisites

- Node.js 18+ installed
- Git repository for your project
- Using Claude Code terminal OR Cursor IDE

## Installation

### Step 1: Install Git for Prompts CLI

**⚠️ Note: This package is not yet published to npm. For now, install from source:**

```bash
# Clone the repository
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Link globally (makes 'prompt' command available everywhere)
npm link
```

**Verify installation:**
```bash
# This should now work from any directory
prompt --version
# Output: 0.1.0

prompt --help
# Shows all available commands
```

**What `npm link` does:**
- Creates a symlink in your global node_modules
- Makes the `prompt` command available system-wide
- Now you can run `prompt` from any directory

**Alternative: Use without global install**
```bash
# If you don't want to use npm link, you can run directly:
cd git-for-prompts
node dist/cli/index.js --help

# Or create an alias in your shell:
# Add to ~/.bashrc or ~/.zshrc:
alias prompt='node /path/to/git-for-prompts/dist/cli/index.js'
```

### Step 2: Verify Installation

```bash
prompt --help
```

You should see:
```
Usage: prompt [options] [command]

Git for Prompts - Version control, review, and test LLM prompts

Commands:
  init                           Initialize a prompts repository
  commit [options] <prompt-id>   Commit a new prompt
  diff [options] <prompt-id>     Show differences between versions
  history [options] <prompt-id>  Show commit history
  test [options] [prompt-id]     Run tests for prompts
  list [options]                 List all prompts
  daemon                         Manage the auto-capture daemon
```

## Setup for Your Project

### Step 3: Initialize in Your Project

Navigate to your project directory and initialize:

```bash
cd ~/your-project
prompt init
```

This creates a `.prompts/` directory:
```
your-project/
├── .prompts/
│   ├── config.yaml       # Configuration
│   ├── prompts/          # Current prompt versions
│   ├── outputs/          # Test outputs
│   └── history/          # Version history
└── ... (your project files)
```

### Step 4: Add to .gitignore (Optional)

If you want to keep prompts private (not commit to git):

```bash
echo ".prompts/" >> .gitignore
```

Or keep them in git to share with your team:
```bash
# Don't add to .gitignore - commit .prompts/ to git
git add .prompts/
```

## For Claude Code Users

### Step 5a: Start Automatic Capture

```bash
# In your project directory
prompt daemon start
```

You'll see:
```
Starting Git for Prompts daemon...
✓ Daemon started
  Watching for AI tool activity...

Press Ctrl+C to stop the daemon
```

Keep this terminal running, or press `Ctrl+C` and install as a service (see below).

### Step 6a: Use Claude Code Normally

Just use Claude Code as you normally would:

```bash
# In another terminal, use Claude Code
claude "Help me refactor this function"
```

Or continue your conversation in the Claude Code terminal interface.

### Step 7a: Commit Your Code

When you're ready to commit your changes:

```bash
git add .
git commit -m "Refactored user authentication"
```

**✨ Magic happens:**
- All your conversations with Claude are automatically saved to `.prompts/`
- The prompt is linked to your commit SHA
- A new session starts for your next round of changes

### View Your Captured Prompts

```bash
# List all prompts
prompt list

# View a specific prompt's history
prompt history <prompt-id>

# See the diff
prompt diff <prompt-id>
```

## For Cursor IDE Users

### Step 5b: Install the Cursor Extension

```bash
# Navigate to the extension directory
cd git-for-prompts/cursor-extension

# Install dependencies
npm install

# Build the extension
npm run compile
```

### Step 6b: Load Extension in Cursor

**Option A: Debug Mode (for development)**
1. Open the `cursor-extension` folder in Cursor
2. Press `F5` (or Run → Start Debugging)
3. A new Cursor window opens with the extension loaded

**Option B: Install as VSIX (for production use)**
```bash
# Package the extension
npm run package

# This creates cursor-prompts-0.1.0.vsix
```

Then in Cursor:
1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "Extensions: Install from VSIX"
3. Select the `cursor-prompts-0.1.0.vsix` file

### Step 7b: Use Cursor Normally

The extension automatically:
- ✅ Detects when `.prompts/` exists in your workspace
- ✅ Starts capturing Cursor AI chats
- ✅ Tracks code changes you make
- ✅ Links everything to git commits

**Status Bar:**
- `⚫ Prompts: Off` - Click to enable
- `🔴 Prompts: On` - Auto-capturing active

**Manual Commands:**
- `Cmd+Shift+P` → "Save Prompt to Repository" - Manual save
- `Cmd+Shift+P` → "Toggle Auto-Capture" - On/off switch
- `Cmd+Shift+P` → "Show Active Sessions" - View ongoing captures

## Configuration

### Create Configuration File

```bash
# Copy the example config
cp ~/git-for-prompts/.promptrc.example.json ~/.promptrc.json

# Or create manually
nano ~/.promptrc.json
```

**Example configuration:**
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
      "*api*key*",
      "*.pem"
    ],
    "maskSensitiveData": true
  },
  "storage": {
    "maxSessionAge": 86400000,
    "autoCleanup": true
  }
}
```

### Check Configuration

```bash
prompt daemon status
```

Output:
```
Daemon Status

Configuration:
  Auto-capture: enabled
  Tools:
    - Claude Code: ✓
    - Cursor: ✓
    - ChatGPT: ✗

Active Sessions:
  No active sessions

Privacy Settings:
  Mask sensitive data: yes
  Exclude patterns: *.env, *secret*, *password*, *api*key*
```

## Advanced: Install Daemon as System Service

To have the daemon always running in the background:

```bash
prompt daemon install
```

**On macOS:**
```bash
# Installs LaunchAgent
# Start service:
launchctl load ~/Library/LaunchAgents/com.gitforprompts.daemon.plist

# Stop service:
launchctl unload ~/Library/LaunchAgents/com.gitforprompts.daemon.plist
```

**On Linux:**
```bash
# Follow the instructions shown after running 'prompt daemon install'
# Creates systemd service
sudo systemctl enable git-prompts-daemon
sudo systemctl start git-prompts-daemon
```

**On Windows:**
```bash
# Install NSSM first: choco install nssm
# Follow the instructions shown
```

## Example Workflow

Here's a complete example of how an external user would use this:

### Day 1: Setup

```bash
# 1. Install Git for Prompts (one-time setup)
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts
npm install && npm run build && npm link

# 2. Go to your project
cd ~/my-app

# 3. Initialize
prompt init

# 4. Start daemon
prompt daemon start
```

### Day 2: Development

```bash
# You're working on a new feature with Claude Code

# In Claude Code terminal:
You: "Add JWT authentication to the user login endpoint"
Claude: [generates code]

You: "Add refresh token support"
Claude: [adds refresh tokens]

You: "Write tests for this"
Claude: [generates tests]

# Commit your work
git add src/auth/
git commit -m "Add JWT auth with refresh tokens"

# ✓ Entire conversation automatically saved!
```

### Day 3: Review

```bash
# See what prompts were captured
prompt list

# Output:
# add-jwt-authentication    [auto-captured] claude-code    2024-01-15
# fix-validation-bug        [auto-captured] cursor         2024-01-14
# refactor-db-queries       [auto-captured] claude-code    2024-01-13

# View details of a specific prompt
prompt history add-jwt-authentication

# Compare versions
prompt diff add-jwt-authentication
```

### Day 4: Share with Team

```bash
# If you kept .prompts/ in git:
git push

# Team members can now:
git pull
prompt list  # See all the prompts you used
prompt diff add-jwt-authentication  # Review your AI workflow
```

## Troubleshooting

### "No prompts repository found"

**Problem:** You see this error when running commands.

**Solution:**
```bash
# Make sure you're in your project directory
cd ~/your-project

# Initialize
prompt init
```

### Daemon not capturing conversations

**Problem:** Conversations not being saved.

**Solution:**
```bash
# Check daemon status
prompt daemon status

# Restart daemon
# Press Ctrl+C to stop
prompt daemon start

# Check configuration
cat ~/.promptrc.json

# Ensure auto-capture is enabled
prompt daemon config --enable-claude-code true
```

### Cursor extension not working

**Problem:** Extension doesn't activate in Cursor.

**Solution:**
1. Check that `.prompts/` exists in workspace root
2. Reload Cursor: `Cmd+R` or `Ctrl+R`
3. Check extension logs: View → Output → "Cursor Prompts"
4. Toggle auto-capture: `Cmd+Shift+P` → "Toggle Auto-Capture"

### Prompts not linked to git commits

**Problem:** Prompts are captured but not linked to commits.

**Solution:**
```bash
# Check if git hooks are installed
ls -la .git/hooks/post-commit

# Reinstall hooks
prompt init

# Make hook executable
chmod +x .git/hooks/post-commit
```

### "Permission denied" when running prompt command

**Problem:** Can't execute the CLI.

**Solution:**
```bash
# If installed from source:
cd git-for-prompts
npm link

# If installed from npm:
npm install -g git-for-prompts

# Verify:
which prompt
prompt --version
```

## Need Help?

- 📖 Read the [Automation Guide](AUTOMATION.md) for detailed usage
- 🔧 Check [Implementation Details](IMPLEMENTATION.md) for architecture
- 🐛 Report issues on [GitHub Issues](https://github.com/gauravkrp/git-for-prompts/issues)
- 💬 Ask questions in [GitHub Discussions](https://github.com/gauravkrp/git-for-prompts/discussions)

## Next Steps

Once you're set up:

1. **Explore captured prompts**: `prompt list`
2. **Review conversation history**: `prompt history <prompt-id>`
3. **Compare versions**: `prompt diff <prompt-id>`
4. **Share with team**: Commit `.prompts/` to git
5. **Run tests**: `prompt test` (see README.md for test setup)

---

**🎉 You're all set! Your AI conversations are now automatically version-controlled.**
