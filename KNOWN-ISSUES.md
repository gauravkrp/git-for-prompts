# Known Issues & Limitations

**Last Updated:** October 5, 2025
**Version:** 0.1.0 (in-process hook architecture)

---

## Testing Status

⚠️ **End-to-end testing incomplete**

### ✅ What's Been Verified:
- Code review completed
- Individual components tested manually
- Conversation parsing verified with real JSONL files
- Git author capture tested
- Git branch tracking tested (current + parent branch detection)
- Hook loading verified
- File capture verified
- Pasted content verified (1531 chars)

### ❌ What Has NOT Been Tested:
- Complete flow: Claude → Commit → Verify
- Multi-session concurrent scenario
- Real-world usage over time
- Windows compatibility
- Large sessions (50+ files)

---

## Known Limitations

### 1. Windows Compatibility (UNTESTED)

**Issue:** Path encoding uses Unix-style paths
```typescript
const encodedPath = cwd.replace(/\//g, '-');
// Windows: C:\Users\... → C:-Users-...
```

**Risk:** Medium
**Status:** Unknown - needs testing

**Workaround:** None yet

---

### 2. Requires Node.js 18.19+

**Issue:** Uses `--import` flag for ESM preloading

**Requirements:**
- Node.js 18.19.0 or higher
- Not backwards compatible

**Workaround:** Upgrade Node.js

---

### 3. Manual Wrapper Setup Required

**Issue:** Requires alias configuration

```bash
alias claude="/path/to/claude-wrapper.sh"
```

**Impact:** Not seamless installation
**Status:** Expected trade-off

**Future:** Could provide installer script

---

### 4. Claude Code Only

**Issue:** Only works with Claude Code terminal tool

**Not Supported:**
- ❌ Cursor IDE
- ❌ ChatGPT interface
- ❌ Other AI coding tools

**Status:** By design (for now)

**Future:** May add Cursor integration

---

### 5. Performance with Many Files

**Issue:** `saveSessionState()` called on EVERY file write

**Potential Impact:**
- Reads ~/.claude/projects/*.jsonl files
- Reads git config
- Writes session JSON
- Could slow down with 50+ file changes

**Risk:** Low-Medium
**Tested:** Only with <10 file changes

**Mitigation:** Add debouncing if needed

---

### 6. Failed Commits Leave Pending Files

**Issue:** Pre-commit creates `*-pending.json` files

**Scenario:**
```bash
git commit -m "test"
# Pre-commit hook runs, creates pending.json
# User aborts commit (Ctrl+C)
# → pending.json files remain
```

**Impact:** Low (cleaned up on next commit)
**Status:** Acceptable

---

### 7. No Conversation = Empty Messages

**Issue:** If conversation not found in ~/.claude/projects/

**Behavior:**
- Session still saved
- `messages: []` (empty array)
- Only file changes recorded

**Causes:**
- Claude Code not storing conversations
- Path encoding mismatch
- Timestamp mismatch

**Debugging:**
```bash
ls -la ~/.claude/projects/
# Should show -Users-you-dev-project/ directory
```

---

### 8. No Retroactive Capture

**Limitation:** Only captures active sessions

**Can't do:**
- ❌ Capture old conversations
- ❌ Recover lost sessions
- ❌ Import existing Claude history

**By design:** Only real-time capture

---

### 9. Silent Failures

**Issue:** Many errors fail silently

**Example:**
```typescript
catch (error) {
  // Silent fail - don't interfere with Claude
}
```

**Good:** Won't break Claude
**Bad:** Hard to debug issues

**Improvement:** Add verbose logging mode

---

## Edge Cases

### Multiple Sessions Within 60 Seconds

**Scenario:** Start 2 Claude sessions 30 seconds apart

**Behavior:**
- 60-second buffer for timestamp matching
- Both might capture overlapping messages
- Best-match scoring should handle correctly

**Risk:** Low
**Status:** Untested

---

### Very Long Conversations

**Scenario:** 100+ messages in single session

**Potential Issues:**
- Large JSONL files to parse
- Memory usage
- Write performance

**Risk:** Low
**Status:** Untested

---

### Symbolic Links

**Issue:** Symlinked project directories

**Behavior:** Unknown
**Status:** Untested

---

### Git Worktrees

**Issue:** Multiple working trees for same repo

**Behavior:** Unknown
**Status:** Untested

---

## Troubleshooting Guide

### Issue: No session files created

**Check:**
```bash
# 1. Hook loaded?
claude --version
# Should show: [gitify-prompt] Capturing session...

# 2. Wrapper working?
which claude
# Should show: .../claude-wrapper.sh

# 3. Made file changes?
# Hook only triggers on file writes

# 4. Check for errors
ls -la ~/.claude/projects/
# Should have your project directory
```

---

### Issue: Empty messages array

**Check:**
```bash
# 1. Conversation files exist?
ls -la ~/.claude/projects/-Users-you-dev-project/

# 2. Recent files?
ls -lt ~/.claude/projects/-Users-you-dev-project/ | head -5

# 3. Path encoding correct?
# Should match your actual project path with / → -
```

---

### Issue: Git author is null

**Check:**
```bash
git config user.name
git config user.email

# If not set:
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

### Issue: Hooks not running

**Check:**
```bash
# Standard git:
ls -la .git/hooks/pre-commit
ls -la .git/hooks/post-commit

# Husky:
ls -la .husky/pre-commit
ls -la .husky/post-commit

# Re-initialize:
gitify-prompt init
```

---

## Recommendations

### Before Using in Production

1. ✅ **Test in sandbox project first**
2. ✅ **Verify end-to-end flow works**
3. ✅ **Check conversations captured correctly**
4. ✅ **Monitor for performance issues**
5. ✅ **Have backup/recovery plan**

### When to Use

**Good for:**
- Personal projects
- Solo development
- Experimentation
- Learning

**Not ready for:**
- Mission-critical projects
- Team environments (untested)
- Production deployments (untested)
- Windows environments (untested)

---

## Reporting Issues

Found a bug? Please report:

1. **GitHub Issues:** https://github.com/gauravkrp/git-for-prompts/issues
2. **Include:**
   - OS and Node.js version
   - Full error message
   - Steps to reproduce
   - Output of `gitify-prompt daemon status` (if applicable)
   - Relevant logs from `.prompts/.meta/`

---

## Future Improvements

### High Priority
- [ ] End-to-end testing
- [ ] Windows support
- [ ] Verbose logging mode
- [ ] Automated tests

### Medium Priority
- [ ] Performance optimization (debouncing)
- [ ] Better error messages
- [ ] `gitify-prompt doctor` command
- [ ] Usage analytics (local)

### Low Priority
- [ ] Cursor IDE support
- [ ] ChatGPT support
- [ ] Web UI for viewing prompts
- [ ] Prompt search/filtering

---

**For detailed technical review, see [COMPREHENSIVE-REVIEW.md](COMPREHENSIVE-REVIEW.md)**
