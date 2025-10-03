# Known Issues & Limitations

## Status: Not Yet Fully Tested

⚠️ **The daemon implementation has been built but NOT fully tested in a real environment.**

### What's Been Verified:
- ✅ Compilation succeeds (TypeScript builds)
- ✅ CLI commands exist (`gitify-prompt daemon start/stop/status`)
- ✅ Basic status check works when daemon not running
- ✅ Code review completed for obvious bugs

### What Has NOT Been Tested:
- ❌ **Daemon actually starting** as background process
- ❌ **Unix socket communication** between client and server
- ❌ **Session creation** via DaemonClient
- ❌ **Multi-repo filtering** in real scenario
- ❌ **Git commit integration** with running daemon
- ❌ **Process cleanup** on daemon stop

## Potential Issues

### 1. Unix Socket Permissions
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

### 2. Stale PID Files
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

### 3. Path Resolution in Compiled Code
**Issue**: `__dirname` might not work correctly in ESM modules.

**Symptoms**:
- Daemon fails to start
- Error: "Cannot find module daemon-process.js"

**Fix**: May need to update `startDaemonBackground()` to use full path:
```typescript
const scriptPath = path.join(process.cwd(), 'dist', 'cli', 'daemon-process.js');
```

### 4. Session Metadata Not Properly Tagged
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

### 5. Git Hook Not Working
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
