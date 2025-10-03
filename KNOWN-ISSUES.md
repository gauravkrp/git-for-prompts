# Known Issues & Limitations

## Status: Not Yet Fully Tested

⚠️ **The daemon implementation has been built but NOT fully tested in a real environment.**

### What's Been Verified:
- ✅ Compilation succeeds (TypeScript builds)
- ✅ CLI commands exist (`gitify-prompt daemon start/stop/status`)
- ✅ Basic status check works when daemon not running
- ✅ Code review completed for obvious bugs
- ✅ **Unix socket communication** between client and server - WORKS!
- ✅ **DaemonClient connection** - Successfully connects and retrieves status
- ✅ **Daemon stop command** - Successfully stops running daemon
- ✅ **Manual daemon start** - Daemon stays alive when started with `node dist/cli/daemon-process.js &`

### What Has NOT Been Tested:
- ⚠️ **Daemon automated background spawn** - ISSUE: Process exits when spawned via `spawn()` with `detached: true`
- ❌ **Session creation** via DaemonClient in real scenario
- ❌ **Multi-repo filtering** in real scenario
- ❌ **Git commit integration** with running daemon

## Potential Issues

### 1. Daemon Background Spawn Issue (CRITICAL)
**Issue**: Daemon exits immediately when spawned via `spawn()` with `detached: true`.

**Status**: ⚠️ **CRITICAL** - Automated daemon start doesn't work

**Workaround**: Start daemon manually:
```bash
# Start daemon manually (works correctly)
node dist/cli/daemon-process.js &

# Verify it's running
gitify-prompt daemon status
```

**Investigation Findings**:
- ✅ Daemon process code is correct - stays alive when run manually
- ✅ Unix socket server works correctly
- ✅ DaemonClient connects and communicates successfully
- ❌ Process exits when spawned with `spawn()` detached mode
- Logs show daemon starts successfully but process disappears
- No error messages in daemon-err.log
- Likely related to Node.js process detachment or file descriptor handling

**Potential Root Causes**:
1. File descriptor closure timing issue
2. Child process group ID not set correctly
3. Process receiving unexpected signal (HUP, PIPE)
4. Node.js event loop exiting despite Unix socket server

**Fix Attempts**:
- ✅ Tried adding explicit `await new Promise(() => {})` keepalive - didn't help
- ✅ Tried closing file descriptors in parent after spawn - didn't help
- ✅ Increased wait time to 1500ms - didn't help

**Next Steps to Debug**:
1. Try using `nohup` wrapper instead of `spawn()` detached
2. Add process event listeners for all signals to log what's happening
3. Try TCP socket instead of Unix socket to rule out socket issues
4. Test on different OS (Linux vs macOS)

### 2. Unix Socket Permissions
**Issue**: Unix socket at `/tmp/gitify-prompt/daemon.sock` may have permission issues.

**Symptoms**:
- `EACCES` or `EPERM` errors when connecting
- Daemon starts but clients can't connect

**Fix**:
```bash
# Check socket permissions
ls -la /tmp/gitify-prompt/daemon.sock

# If needed, fix permissions
chmod 666 /tmp/gitify-prompt/daemon.sock
```

### 3. Stale PID Files
**Issue**: If daemon crashes, PID file might remain.

**Symptoms**:
- `gitify-prompt daemon start` says "already running"
- But daemon isn't actually running

**Fix**:
```bash
# Manually clean up
rm /tmp/gitify-prompt/daemon.pid
rm /tmp/gitify-prompt/daemon.sock
```

### 4. Path Resolution in Compiled Code
**Issue**: `__dirname` might not work correctly in ESM modules.

**Symptoms**:
- Daemon fails to start
- Error: "Cannot find module daemon-process.js"

**Fix**: May need to update `startDaemonBackground()` to use full path:
```typescript
const scriptPath = path.join(process.cwd(), 'dist', 'cli', 'daemon-process.js');
```

### 5. Session Metadata Not Properly Tagged
**Issue**: Sessions might not get `repoPath` metadata.

**Symptoms**:
- All sessions saved on any commit
- Multi-repo filtering doesn't work

**Debug**:
```bash
# Check session metadata
gitify-prompt daemon status
# Look for "Repo:" field in session details
```

### 6. Git Hook Not Working
**Issue**: The git post-commit hook references old package name.

**Current hook**:
```bash
const { CaptureDaemon } = require('git-for-prompts');
```

**Should be**:
```bash
const { DaemonClient } = require('gitify-prompt');
```

**Fix**: Need to update hook generation in `src/commands/init.ts`

## Windows Compatibility

### Issue: Unix Sockets Don't Work on Windows
Unix sockets (`/tmp/gitify-prompt/daemon.sock`) are not available on Windows.

**Status**: ❌ Not supported yet

**Workaround Options**:
1. Use TCP socket on localhost instead
2. Use Windows named pipes
3. Use a different IPC mechanism

## Testing Checklist

To properly test the daemon:

```bash
# 1. Clean slate
rm -rf /tmp/gitify-prompt

# 2. Start daemon
gitify-prompt daemon start
# Should see: "✓ Daemon started successfully"

# 3. Check status
gitify-prompt daemon status
# Should see: "✓ Daemon is running"

# 4. Check files created
ls -la /tmp/gitify-prompt/
# Should see: daemon.sock, daemon.pid, daemon.log

# 5. Check daemon process
ps aux | grep daemon-process
# Should see the background process

# 6. Test stop
gitify-prompt daemon stop
# Should see: "✓ Daemon stopped"

# 7. Verify cleanup
ls -la /tmp/gitify-prompt/
# daemon.sock and daemon.pid should be gone
```

## Real-World Testing Needed

### Test Scenario 1: Basic Capture
```bash
# 1. Initialize repo
cd ~/test-project
gitify-prompt init

# 2. Start daemon
gitify-prompt daemon start

# 3. Use Claude (if integration working)
# ... do some work ...

# 4. Check sessions
gitify-prompt daemon status
# Should show active sessions

# 5. Commit
git commit -m "Test"

# 6. Check if prompts saved
ls .prompts/prompts/
```

### Test Scenario 2: Multi-Repo
```bash
# 1. Start daemon once
gitify-prompt daemon start

# 2. Work on repo1
cd ~/repo1
# ... Claude work ...

# 3. Work on repo2 (different terminal)
cd ~/repo2
# ... Claude work ...

# 4. Check status shows both repos
gitify-prompt daemon status
# Should show sessions grouped by repo

# 5. Commit in repo1
cd ~/repo1
git commit -m "Test"

# 6. Verify only repo1 sessions saved
gitify-prompt daemon status
# repo2 sessions should still be active
```

## Recommended Next Steps

1. **Manual Testing**: Actually start the daemon and test basic flow
2. **Fix Git Hook**: Update hook generation to use DaemonClient
3. **Add Error Handling**: More robust error messages
4. **Add Logs**: Improve daemon logging for debugging
5. **Windows Support**: Implement TCP socket fallback
6. **Integration Tests**: Automated tests for daemon functionality

## Current Recommendation

**For Users**: This is **experimental code**. The daemon may not work as expected. Use at your own risk.

**For Production**: Do NOT use yet. Wait for proper testing and bug fixes.

**For Development**: Test in a sandbox environment first!

---

**Last Updated**: 2024-10-04 (Commit: 5c56b30)
