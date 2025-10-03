# Daemon Architecture

## Problem

The previous daemon implementation only worked in the same terminal instance where it was started. This meant:
- ❌ Daemon died when terminal closed
- ❌ Couldn't be accessed from other terminals
- ❌ Not truly a background service

## Solution: Client-Server Architecture with IPC

The new implementation uses a **persistent background daemon** with **Inter-Process Communication (IPC)**.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Terminal 1 (CLI)                       │
│                                                          │
│  $ gitify-prompt daemon start                           │
│    └─> Spawns detached daemon process                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (spawns detached)
                         ↓
┌─────────────────────────────────────────────────────────┐
│          Background Daemon Process (detached)            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  DaemonServer                                   │    │
│  │  • Runs independently of any terminal          │    │
│  │  • Listens on Unix socket                      │    │
│  │  • Maintains capture sessions                  │    │
│  │  • Accepts connections from multiple clients   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Files:                                                  │
│  • /tmp/gitify-prompt/daemon.sock (Unix socket)         │
│  • /tmp/gitify-prompt/daemon.pid (Process ID)           │
│  • /tmp/gitify-prompt/daemon.log (Logs)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │                    │                    │
    (connects via socket) (connects)         (connects)
         │                    │                    │
┌────────┴─────┐   ┌──────────┴────────┐   ┌──────┴──────┐
│  Terminal 1  │   │    Terminal 2     │   │ Git Hook    │
│  (Claude)    │   │    (Cursor)       │   │ (on commit) │
│              │   │                   │   │             │
│ DaemonClient │   │  DaemonClient     │   │DaemonClient │
└──────────────┘   └───────────────────┘   └─────────────┘
```

### Components

#### 1. **DaemonServer** (`src/lib/daemon-server.ts`)

The persistent background server that:
- Runs as a **detached process** (survives terminal close)
- Listens on a **Unix socket** for client connections
- Maintains **capture sessions** in memory
- Handles **multiple simultaneous clients**
- Writes **PID file** for process tracking

**Key Methods:**
- `startServer()` - Start listening for connections
- `handleClient(socket)` - Handle individual client connections
- `handleMessage(message)` - Process client commands
- `stop()` - Gracefully shut down

#### 2. **DaemonClient** (`src/lib/daemon-server.ts`)

Client library for communicating with the daemon:
- Connects to daemon via **Unix socket**
- Sends **JSON-RPC style commands**
- Receives **responses**
- Can be used from any process/terminal

**Key Methods:**
- `send(command, args)` - Send command to daemon
- `isRunning()` - Check if daemon is running
- `createSession()` - Create new capture session
- `addMessage()` - Add message to session
- `saveSession()` - Save session to .prompts/

#### 3. **Daemon Process** (`src/cli/daemon-process.ts`)

Entry point for the background daemon:
- **Spawned as detached process** by `startDaemonBackground()`
- Runs `DaemonServer.startServer()`
- Handles signals (SIGTERM, SIGINT)
- Independent of parent process

### How It Works

#### Starting the Daemon

```bash
$ gitify-prompt daemon start
```

1. CLI calls `startDaemon()` in `src/commands/daemon.ts`
2. Checks if daemon is already running (via PID file)
3. Spawns `daemon-process.ts` as detached child process
4. Child process starts `DaemonServer`
5. Server creates Unix socket at `/tmp/gitify-prompt/daemon.sock`
6. Server writes PID to `/tmp/gitify-prompt/daemon.pid`
7. Parent process exits, daemon continues running in background

#### Using the Daemon (from any terminal)

```bash
# Terminal 1: Claude Code
$ claude "Add authentication"
# Daemon automatically captures via DaemonClient

# Terminal 2: Check status
$ gitify-prompt daemon status
✓ Daemon is running
Active Sessions: 1

# Terminal 3: Stop daemon
$ gitify-prompt daemon stop
✓ Daemon stopped
```

#### Communication Protocol

Clients send JSON messages over Unix socket:

```json
{
  "command": "createSession",
  "tool": "claude-code",
  "metadata": { "cwd": "/path/to/project" }
}
```

Server responds:

```json
{
  "sessionId": "a1b2c3d4"
}
```

### Supported Commands

| Command | Description |
|---------|-------------|
| `createSession` | Create new capture session |
| `addMessage` | Add message to session |
| `addCodeChange` | Add code change to session |
| `saveSession` | Save session to .prompts/ |
| `getActiveSessions` | Get all active sessions |
| `getConfig` | Get daemon configuration |
| `status` | Get daemon status |
| `ping` | Check if daemon is alive |

### File Locations

All daemon files are stored in `/tmp/gitify-prompt/`:

- **`daemon.sock`** - Unix socket for IPC
- **`daemon.pid`** - Process ID of running daemon
- **`daemon.log`** - Daemon activity logs

These are ephemeral (cleared on reboot), which is appropriate for runtime files.

### Process Lifecycle

```
┌─ Start ─────────────────────────────────────────┐
│ gitify-prompt daemon start                      │
│   ↓                                             │
│ Spawn detached process                          │
│   ↓                                             │
│ DaemonServer.startServer()                      │
│   ↓                                             │
│ Listen on Unix socket                           │
│   ↓                                             │
│ Write PID file                                  │
│   ↓                                             │
│ Parent exits, daemon continues                  │
└─────────────────────────────────────────────────┘

┌─ Running ───────────────────────────────────────┐
│ Accept connections from multiple clients        │
│ Handle commands (createSession, addMessage...)  │
│ Maintain capture sessions in memory             │
│ Auto-save sessions on git commits               │
│ Log activity to daemon.log                      │
└─────────────────────────────────────────────────┘

┌─ Stop ──────────────────────────────────────────┐
│ gitify-prompt daemon stop                       │
│   ↓                                             │
│ Read PID from daemon.pid                        │
│   ↓                                             │
│ Send SIGTERM to process                         │
│   ↓                                             │
│ Daemon receives signal                          │
│   ↓                                             │
│ Save all active sessions                        │
│   ↓                                             │
│ Close Unix socket                               │
│   ↓                                             │
│ Remove socket and PID files                     │
│   ↓                                             │
│ Exit process                                    │
└─────────────────────────────────────────────────┘
```

### Benefits

✅ **Persistent** - Daemon survives terminal close
✅ **Multi-terminal** - Accessible from any terminal
✅ **Multi-user** - Multiple processes can connect
✅ **Automatic** - No manual intervention needed
✅ **Reliable** - PID file tracks running state
✅ **Clean** - Proper shutdown and cleanup

### Example Usage

```bash
# Terminal 1: Start daemon (only once)
$ gitify-prompt daemon start
✓ Daemon started successfully
The daemon is now running in the background.

# Terminal 1: Close terminal
# Daemon continues running!

# Terminal 2 (new session): Check status
$ gitify-prompt daemon status
✓ Daemon is running

Active Sessions:
  No active sessions

# Terminal 2: Use Claude Code
$ claude "Refactor this function"
# Daemon captures automatically

# Terminal 3: Check again
$ gitify-prompt daemon status
✓ Daemon is running

Active Sessions:
  e5f6g7h8
    Tool: claude-code
    Messages: 2
    Code changes: 1

# Terminal 3: Stop daemon
$ gitify-prompt daemon stop
✓ Daemon stopped
```

### Integration

The Claude Code and Cursor integrations use `DaemonClient` to communicate:

```typescript
import { DaemonClient } from './daemon-server.js';

const client = new DaemonClient();

// Create session
const sessionId = await client.createSession('claude-code', {
  cwd: process.cwd()
});

// Add messages
await client.addMessage(sessionId, 'user', 'Your prompt');
await client.addMessage(sessionId, 'assistant', 'AI response');

// Save on commit
await client.saveSession(sessionId, commitSha);
```

### Error Handling

- **Daemon not running**: Client gets connection error, shows helpful message
- **Socket permission denied**: Falls back to PID-based detection
- **Daemon crashes**: PID file is stale, cleaned up on next start
- **Multiple start attempts**: Detects already running, shows status

### Future Enhancements

Potential improvements:
- **Authentication** - Token-based auth for security
- **Remote daemon** - Connect to daemon over network
- **Clustering** - Multiple daemons for load balancing
- **Persistence** - Save sessions to disk for crash recovery
- **WebSocket** - Web-based clients
- **Encryption** - Encrypt sensitive data in transit

---

**The new daemon is now truly persistent and accessible from anywhere! 🎉**
