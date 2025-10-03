# Quick Start: gitify-prompt

**5-minute setup to automatically version control your AI prompts**

## Install (One Time)

```bash
# Clone and install
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts
npm install && npm run build && npm link

# Verify
gitify-prompt --version
```

## Use in Your Project

```bash
# Go to your project
cd ~/your-project

# Initialize
gitify-prompt init

# Start auto-capture
gitify-prompt daemon start
```

## That's It! 🎉

Now:
- ✅ Work with Claude Code or Cursor IDE as usual
- ✅ All conversations automatically captured
- ✅ Linked to git commits automatically
- ✅ Never manually save prompts again

## View Captured Prompts

```bash
# List all
gitify-prompt list

# View history
gitify-prompt history <prompt-id>

# Compare versions
gitify-prompt diff <prompt-id>

# Check daemon status
gitify-prompt daemon status
```

## Full Workflow Example

```bash
# 1. You ask Claude Code to add a feature
You: "Add user authentication with JWT"

# 2. Claude generates code, you iterate

# 3. Commit when ready
git commit -m "Add JWT authentication"

# ✓ Entire conversation auto-saved to .prompts/
# ✓ Linked to commit SHA
# ✓ Ready for review, testing, diff
```

## Learn More

- **[GETTING-STARTED.md](GETTING-STARTED.md)** - Detailed setup guide
- **[AUTOMATION.md](AUTOMATION.md)** - Complete automation guide
- **[README.md](README.md)** - Full documentation

---

**Pro Tip:** Install as a system service for always-on capture:
```bash
gitify-prompt daemon install
```
