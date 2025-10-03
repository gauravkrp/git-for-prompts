# Daemon FAQ

## Q: Does the daemon work only in the same terminal instance?

**A: No! The new daemon works across ALL terminals on your computer.** 🎉

### How It Works:

```
┌────────────────────────────────────────────────────────┐
│                     Background Daemon                   │
│          (Runs independently of any terminal)           │
│                                                         │
│   /tmp/gitify-prompt/daemon.sock  (Unix socket)        │
└────────────────────────────────────────────────────────┘
         ↑              ↑              ↑
         │              │              │
    (connects)     (connects)     (connects)
         │              │              │
┌────────┴──┐   ┌───────┴──────┐  ┌───┴─────┐
│ Terminal 1│   │  Terminal 2  │  │Terminal 3│
│  (Claude) │   │   (Cursor)   │  │  (Git)   │
└───────────┘   └──────────────┘  └──────────┘
```

### Example Workflow:

```bash
# Terminal 1: Start daemon (only once)
$ gitify-prompt daemon start
✓ Daemon started successfully
The daemon is now running in the background.

# Close Terminal 1 - daemon keeps running!

# Terminal 2 (new session): Check status
$ gitify-prompt daemon status
✓ Daemon is running  # ← Works from different terminal!

# Terminal 2: Use Claude Code
$ claude "Add authentication"
# ✓ Daemon automatically captures from this terminal

# Terminal 3: Check what's being captured
$ gitify-prompt daemon status
Active Sessions: 1
  Messages: 2
  Tool: claude-code

# Terminal 4: Stop daemon
$ gitify-prompt daemon stop
✓ Daemon stopped
```

## Q: Will it intercept Claude instances from ANY terminal on the computer?

**A: Yes, as long as the daemon is running!**

### Requirements:

1. **Start daemon once**: `gitify-prompt daemon start`
2. **Daemon stays running** in background (survives terminal close)
3. **Any terminal** can now connect to the daemon

### How Capture Works:

```bash
# Start daemon (Terminal 1)
$ gitify-prompt daemon start

# Use Claude in Terminal 2
$ claude "Help me code"
# ✓ Automatically captured by daemon

# Use Claude in Terminal 3
$ claude "Fix this bug"
# ✓ Also captured by same daemon

# Use Claude in Terminal 4
$ claude "Refactor code"
# ✓ Also captured!

# All captured sessions accessible from ANY terminal:
$ gitify-prompt daemon status
Active Sessions: 3
```

## Q: What happens when I restart my computer?

**A: The daemon stops (it's in /tmp).** You need to:

```bash
# After reboot:
$ gitify-prompt daemon start
```

**Or** install as a system service to auto-start:

```bash
$ gitify-prompt daemon install
# Now starts automatically on boot!
```

## Q: Can multiple people on the same computer use separate daemons?

**A: Yes!** Each user has their own daemon:

```bash
# User 1's daemon
/tmp/gitify-prompt/daemon.sock (owned by user1)

# User 2's daemon
/tmp/gitify-prompt/daemon.sock (owned by user2)
```

The files are in `/tmp` which is per-user isolated.

## Q: What if daemon crashes?

```bash
# Check if running
$ gitify-prompt daemon status
✗ Daemon is not running

# Restart it
$ gitify-prompt daemon start
✓ Daemon started successfully
```

Old PID file is automatically cleaned up on next start.

## Q: How do I see what's being captured?

```bash
# Check status
$ gitify-prompt daemon status

# View active sessions
Active Sessions:
  abc123def
    Tool: claude-code
    Messages: 5
    Code changes: 2
    Started: 2024-01-15 10:30:00

# View logs
$ tail -f /tmp/gitify-prompt/daemon.log
```

## Q: Can I stop the daemon?

```bash
# Stop from any terminal
$ gitify-prompt daemon stop
✓ Daemon stopped

# All active sessions are saved before stopping
```

## Q: Does this work on Windows?

**Not yet.** Unix sockets are used for IPC, which are macOS/Linux.

**Windows workaround** (future):
- Use named pipes instead of Unix sockets
- Or use TCP socket on localhost
- Or use Windows IPC mechanisms

## Q: How much memory does the daemon use?

**Very little!** The daemon:
- Stores sessions in memory (few KB each)
- No heavy processing
- Typically <50MB RAM
- Negligible CPU usage

## Q: Can the daemon capture from VS Code / Cursor?

**Yes!** Both work:

```bash
# Start daemon
$ gitify-prompt daemon start

# Use Cursor (with extension installed)
# ✓ Captured via Cursor extension → daemon

# Use VS Code with Claude
# ✓ Captured if integration is set up
```

## Q: What's the difference between daemon and integration?

**Daemon**: Background service that stores sessions

**Integration**: Frontend that captures conversations and sends to daemon

```
Claude Code → ClaudeCodeIntegration → DaemonClient → Daemon
Cursor IDE  → CursorExtension      → DaemonClient → Daemon
```

## Q: Do I need to run `gitify-prompt init` in every project?

**Yes**, but only once per project:

```bash
# Project 1
cd ~/project1
gitify-prompt init

# Project 2
cd ~/project2
gitify-prompt init

# One daemon serves all projects
$ gitify-prompt daemon start  # Run once globally
```

## Q: Can I have multiple daemons for different projects?

**Not recommended.** One daemon can handle all projects.

But technically possible by changing socket path in config.

## Q: How do I debug if capture isn't working?

```bash
# 1. Check daemon status
$ gitify-prompt daemon status

# 2. Check daemon logs
$ tail -f /tmp/gitify-prompt/daemon.log

# 3. Check if socket exists
$ ls -la /tmp/gitify-prompt/daemon.sock

# 4. Test daemon connection
$ gitify-prompt daemon status
# Should show "✓ Daemon is running"

# 5. Restart daemon
$ gitify-prompt daemon stop
$ gitify-prompt daemon start
```

---

## Summary: How It All Works Together

```
1. Start daemon once (from any terminal):
   $ gitify-prompt daemon start

2. Daemon runs in background (independent of terminals)

3. Any terminal using Claude Code connects to daemon automatically

4. All conversations captured and saved to .prompts/ on git commit

5. Check status from any terminal:
   $ gitify-prompt daemon status

6. Stop from any terminal:
   $ gitify-prompt daemon stop
```

**Key Point: The daemon is a persistent background service that ALL terminals connect to via Unix socket. It's not tied to any specific terminal session!** 🚀
