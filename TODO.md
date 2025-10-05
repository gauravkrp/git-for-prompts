# Implementation TODO

## ✅ Recently Completed

### 1. Branch Awareness - **IMPLEMENTED** (2025-10-05)
**Identified by:** User feedback
**Implemented in:** commit on feature/branch-tracking

**Solution:**
- ✅ Added `branch` field to session metadata
- ✅ Added `parentBranch` field (inferred from tracking branch or main/master)
- ✅ Captures current branch: `git rev-parse --abbrev-ref HEAD`
- ✅ Updated session format to include branch metadata
- ✅ Tested on feature branch (feature/branch-tracking)
- ⏳ TODO: Add `gitify-prompt list --branch <name>` filter (when list command implemented)
- ⏳ TODO: Handle merge commits display

**Session format:**
```json
{
  "metadata": {
    "commitSha": "abc123",
    "branch": "feature-authentication",
    "parentBranch": "main"
  }
}
```

---

## 🚨 Critical Issues

### 1. Dogfooding - Not Using Tool on Itself
**Problem:** We're building gitify-prompt but not capturing our own conversations

**Why:** Not using the wrapper (`claude` vs wrapper alias)

**Action:**
- [ ] Set up wrapper alias for development
- [ ] Use gitify-prompt on gitify-prompt repo
- [ ] Test edge cases in real usage

---

### 2. End-to-End Testing - **NOT DONE**
**Status:** No complete flow tested yet

**Missing:**
- [ ] Full cycle: Claude → Commit → Verify prompt
- [ ] Multi-session scenario (3 terminals, same repo)
- [ ] Husky integration in real project
- [ ] GitHub Desktop compatibility test
- [ ] Large session (50+ files)

---

## High Priority Features

### 3. Testing Infrastructure
**Status:** Not implemented

- [ ] `gitify-prompt test <prompt-id>` command
- [ ] Test case format (YAML with expected outputs)
- [ ] Run prompt against test cases
- [ ] Output snapshot + diffing
- [ ] Golden-output comparison (BLEU/ROUGE scores)
- [ ] GitHub Action for CI testing

**Example test format:**
```yaml
test:
  prompt-id: abc123
  cases:
    - input: "test case 1"
      expected: "expected output"
      tolerance: 0.8  # similarity threshold
```

---

### 4. Multi-Provider Support
**Status:** Not implemented

- [ ] Provider adapter architecture
- [ ] OpenAI adapter
- [ ] Anthropic adapter
- [ ] Local LLM adapter (ollama, lmstudio)
- [ ] Provider metadata in session
- [ ] Cross-model testing matrix

---

### 5. Web Dashboard
**Status:** Not started

- [ ] Search prompts
- [ ] View prompt history
- [ ] Side-by-side diff UI
- [ ] Tag prompts
- [ ] PR-style review interface
- [ ] Team analytics

**Tech stack:** Next.js + React + Tailwind?

---

## Medium Priority

### 6. Performance Optimization
**Issue:** `saveSessionState()` called on EVERY file write

**Impact:**
- Reads JSONL files
- Reads git config
- Writes session JSON
- Could be slow with 50+ file changes

**Mitigation:**
- [ ] Add debouncing (wait 500ms before saving)
- [ ] Cache git config reads
- [ ] Batch JSONL parsing
- [ ] Profile with large sessions

---

### 7. Windows Support
**Status:** UNTESTED

**Issues:**
- Path encoding: `/` → `-` vs `\` → `-`
- Claude JSONL location on Windows
- Git hooks on Windows

**Tasks:**
- [ ] Test on Windows
- [ ] OS-specific path encoding
- [ ] Windows installation docs
- [ ] PowerShell wrapper script?

---

### 8. Error Handling & Debugging
**Issue:** Too many silent failures

**Good:** Won't break Claude
**Bad:** Hard to debug

**Tasks:**
- [ ] Add `--verbose` flag for logging
- [ ] Log file: `.prompts/.meta/debug.log`
- [ ] `gitify-prompt doctor` diagnostic command
- [ ] Better error messages

---

### 9. List/Show Commands
**Status:** Partially implemented

- [ ] `gitify-prompt list` - List all captured prompts
- [ ] `gitify-prompt list --branch <name>` - Filter by branch
- [ ] `gitify-prompt list --author <name>` - Filter by author
- [ ] `gitify-prompt show <sha>` - View conversation for commit
- [ ] `gitify-prompt diff <sha1> <sha2>` - Compare prompts
- [ ] `gitify-prompt history <file>` - View prompts that modified file

---

## Low Priority / Future

### 10. Cursor IDE Support
**Status:** Not started

- [ ] Cursor conversation capture
- [ ] Cursor-specific JSONL location
- [ ] Test with Cursor IDE

---

### 11. ChatGPT Support
**Status:** Not started

- [ ] Browser extension for ChatGPT
- [ ] Capture ChatGPT conversations
- [ ] Save to .prompts/ manually

---

### 12. Publishing
**Status:** Not published

- [ ] Verify package.json metadata
- [ ] Test `npm pack`
- [ ] Add .npmignore
- [ ] Publish to npm: `npm publish --access public`
- [ ] Update README (remove "install from source")
- [ ] Create GitHub release
- [ ] Announce (Twitter, Reddit, HN)

**See:** PUBLISH.md for full checklist

---

### 13. Documentation

- [ ] Add architecture diagram (update with branching)
- [ ] Add workflow examples (feature branches)
- [ ] Add troubleshooting for Windows
- [ ] Add video demo
- [ ] Add contributing guide details

---

### 14. Prompt Format Portability
**Status:** Design phase

**Goal:** Make prompts portable across tools

```yaml
# .prompts/prompts/abc123.yaml
prompt:
  id: user-onboarding-welcome
  content: |
    Write a friendly onboarding email...
  metadata:
    model: claude-3-5-sonnet
    temperature: 0.7
    tags: [email, onboarding]
  tests:
    - name: "no spelling errors"
      check: "spelling_errors == 0"
```

**Tasks:**
- [ ] Define portable format spec
- [ ] Convert from JSONL to YAML
- [ ] Support both formats
- [ ] Export command

---

### 15. Security & Privacy

- [ ] Sensitive data masking (API keys, passwords)
- [ ] `.promptignore` patterns
- [ ] Encryption at rest option
- [ ] On-prem deployment docs
- [ ] Audit log (who accessed what)

---

### 16. Installer Script
**Status:** Not started

- [ ] One-command install script
- [ ] Auto-add wrapper alias to shell config
- [ ] Auto-detect shell (zsh/bash)
- [ ] Verify Node.js version

```bash
curl -fsSL https://gitify-prompt.com/install.sh | sh
```

---

## Bugs to Fix

### 17. Auto-Commit Infinite Loop Risk
**Status:** Mitigated with `--no-verify`

**Verify:**
- [ ] Test that post-commit auto-commit doesn't trigger pre-commit
- [ ] Test with multiple consecutive commits
- [ ] Document the `--no-verify` pattern

---

### 18. Pasted Content Edge Cases
**Status:** Verified for 1531 chars, but...

**Test:**
- [ ] Very large pasted content (10K+ chars)
- [ ] Binary content (images)
- [ ] Special characters (emoji, unicode)

---

## Testing Checklist

### Unit Tests (None Currently)
- [ ] Test conversation parsing (JSONL)
- [ ] Test path encoding
- [ ] Test session matching logic
- [ ] Test git author extraction
- [ ] Test file change capture

### Integration Tests
- [ ] Test full hook loading
- [ ] Test pre-commit hook
- [ ] Test post-commit hook
- [ ] Test auto-commit

### E2E Tests
- [ ] Test full workflow (as user)
- [ ] Test multi-session
- [ ] Test branch switching
- [ ] Test merge commits

---

## Release Plan

### v0.1.1 - Bug Fixes (Next)
- [ ] Fix branch awareness
- [ ] Add list/show commands
- [ ] End-to-end testing
- [ ] Windows testing

### v0.2.0 - Testing
- [ ] `gitify-prompt test` command
- [ ] GitHub Action
- [ ] Output snapshots

### v0.3.0 - Multi-Provider
- [ ] Provider adapters
- [ ] Cross-model testing

### v0.4.0 - Dashboard
- [ ] Web UI
- [ ] Search & filter
- [ ] PR review interface

### v1.0.0 - Production Ready
- [ ] All features stable
- [ ] Full test coverage
- [ ] Windows support
- [ ] Published to npm
- [ ] Enterprise features (SSO, on-prem)

---

## Current Priority Order

1. ~~**Branch awareness**~~ ✅ **COMPLETED** (2025-10-05)
2. **End-to-end testing** (De-risk before publishing)
3. **List/show commands** (Basic UX needed)
4. **Publish to npm** (Get users!)
5. **Testing infrastructure** (Core differentiator)
6. **Web dashboard** (Team collaboration)

---

**Last Updated:** 2025-10-05
**Next Review:** After v0.1.1 release
