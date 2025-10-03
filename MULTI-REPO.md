# Multi-Repo Support

## The Problem

When working on **2-3 repos simultaneously** across different IDE instances with Claude in each:

```
Terminal 1: ~/project1 with Claude
Terminal 2: ~/project2 with Claude
Terminal 3: ~/project3 with Claude

❓ How does the daemon handle this?
❓ Do sessions get mixed up?
❓ Does commit in project1 save sessions from project2?
```

## The Solution: Repo-Tagged Sessions

**One global daemon** serves all repos, but **sessions are tagged by repo path**.

### Architecture

```
┌──────────────────────────────────────────────────┐
│              Global Daemon                        │
│                                                   │
│  Sessions:                                        │
│  ├─ abc123 (repo: ~/project1) ← Claude Term 1   │
│  ├─ def456 (repo: ~/project1) ← Cursor IDE      │
│  ├─ ghi789 (repo: ~/project2) ← Claude Term 2   │
│  └─ jkl012 (repo: ~/project3) ← Claude Term 3   │
│                                                   │
└──────────────────────────────────────────────────┘
```

### How It Works

#### 1. **Session Creation** - Tagged with Repo Path

```typescript
// When creating a session
await client.createSession('claude-code', {
  cwd: '/Users/you/project1',
  repoPath: '/Users/you/project1',  // ← Key: Tagged!
  platform: 'darwin'
});
```

#### 2. **Git Commit** - Filters by Repo

```bash
# In project1
$ git commit -m "Add feature"

# Git hook calls:
await client.saveSessionsForRepo('/Users/you/project1', commitSha);

# Only saves sessions where:
# session.metadata.repoPath === '/Users/you/project1'
```

#### 3. **Status** - Grouped by Repo

```bash
$ gitify-prompt daemon status

Active Sessions: 4 session(s)

Sessions by Repository:
  ~/project1
    2 active session(s)
  ~/project2
    1 active session(s)
  ~/project3
    1 active session(s)
```

## Real-World Example

### Setup

```bash
# Start ONE global daemon
$ gitify-prompt daemon start
✓ Daemon started successfully
```

### Working on Project 1

```bash
# Terminal 1: Project 1
$ cd ~/project1
$ claude "Add user authentication"
# ✓ Session created, tagged with ~/project1

# Terminal 2: Also Project 1 (different terminal, Cursor)
$ cd ~/project1
$ cursor .
# Use Cursor AI
# ✓ Another session created, also tagged with ~/project1
```

### Working on Project 2

```bash
# Terminal 3: Project 2
$ cd ~/project2
$ claude "Fix the database query"
# ✓ Session created, tagged with ~/project2
```

### Working on Project 3

```bash
# Terminal 4: Project 3
$ cd ~/project3
$ claude "Refactor API endpoints"
# ✓ Session created, tagged with ~/project3
```

### Check Status

```bash
$ gitify-prompt daemon status

✓ Daemon is running

Active Sessions: 4 session(s)

Sessions by Repository:
  ~/project1
    2 active session(s)    ← Two IDE instances
  ~/project2
    1 active session(s)
  ~/project3
    1 active session(s)

Session Details:
  abc12345
    Tool: claude-code
    Repo: ~/project1
    Messages: 3
    Started: 2024-01-15 10:30:00

  def67890
    Tool: cursor
    Repo: ~/project1
    Messages: 5
    Started: 2024-01-15 10:35:00

  ghi11111
    Tool: claude-code
    Repo: ~/project2
    Messages: 2
    Started: 2024-01-15 10:40:00

  jkl22222
    Tool: claude-code
    Repo: ~/project3
    Messages: 4
    Started: 2024-01-15 10:45:00
```

### Commit Project 1

```bash
# In Terminal 1 or 2 (both in project1)
$ cd ~/project1
$ git commit -m "Add authentication"

Capturing prompts for commit a1b2c3d...
✓ Captured 2 session(s) for commit a1b2c3d

# Saves BOTH sessions tagged with ~/project1
# (One from Claude terminal, one from Cursor)
# Does NOT save project2 or project3 sessions!
```

### Commit Project 2

```bash
# In Terminal 3
$ cd ~/project2
$ git commit -m "Fix database query"

Capturing prompts for commit d4e5f6g...
✓ Captured 1 session(s) for commit d4e5f6g

# Only saves the project2 session
# project1 and project3 sessions stay active
```

### Check Status After Commits

```bash
$ gitify-prompt daemon status

Active Sessions: 1 session(s)

Sessions by Repository:
  ~/project3
    1 active session(s)    ← Only project3 left

# project1 and project2 sessions were saved and cleared
# project3 session still active (no commit yet)
```

## Benefits

✅ **One Daemon** - Single process serves all repos
✅ **Isolated Sessions** - Sessions don't mix between repos
✅ **Smart Saving** - Git commit only saves sessions for THAT repo
✅ **Multi-Instance** - Multiple terminals/IDEs per repo work correctly
✅ **Efficient** - No need for multiple daemon processes

## Edge Cases Handled

### Same Repo, Multiple Terminals

```bash
# Terminal 1
$ cd ~/project1
$ claude "Feature A"

# Terminal 2
$ cd ~/project1
$ claude "Feature B"

# Both sessions tagged with ~/project1
# Commit saves BOTH:
$ git commit -m "Add features"
✓ Captured 2 session(s) for commit ...
```

### Different Repos, Same Directory Name

```bash
$ cd ~/work/backend
$ claude "Fix API"
# Tagged with ~/work/backend

$ cd ~/personal/backend
$ claude "Add tests"
# Tagged with ~/personal/backend

# Different full paths, no conflict!
```

### Subdirectory Commits

```bash
$ cd ~/project1
$ claude "Add feature"
# Session tagged with ~/project1

# Commit from subdirectory
$ cd ~/project1/src/api
$ git commit -m "Update API"

# Git hook runs from repo root
# Correctly identifies repo as ~/project1
# Saves the session!
```

## Implementation Details

### Session Metadata

```typescript
{
  id: 'abc123',
  tool: 'claude-code',
  metadata: {
    cwd: '/Users/you/project1',      // Working directory
    repoPath: '/Users/you/project1',  // Repo root (for filtering)
    platform: 'darwin',
    nodeVersion: 'v22.14.0'
  },
  messages: [...],
  codeChanges: [...]
}
```

### Filtering Logic

```typescript
// Save sessions for a repo
const repoSessions = allSessions.filter(s =>
  s.metadata.cwd === repoPath ||
  s.metadata.repoPath === repoPath
);

// Save each matching session
for (const session of repoSessions) {
  await daemon.saveSession(session, commitSha);
}
```

### Git Hook Integration

```bash
#!/bin/sh
# .git/hooks/post-commit

COMMIT_SHA=$(git rev-parse HEAD)
REPO_ROOT=$(git rev-parse --show-toplevel)

# Call with repo path
gitify-prompt-daemon-capture "$REPO_ROOT" "$COMMIT_SHA"
```

## Configuration

### Per-Repo .prompts Directory

Each repo has its own `.prompts/` directory:

```
~/project1/.prompts/    ← Project 1 prompts
~/project2/.prompts/    ← Project 2 prompts
~/project3/.prompts/    ← Project 3 prompts
```

Sessions are saved to the correct repo's `.prompts/` directory based on the repo path tag.

### Global Daemon Config

One global config for all repos:

```json
// ~/.promptrc.json
{
  "autoCapture": {
    "enabled": true,
    "tools": {
      "claude-code": true,
      "cursor": true
    }
  }
}
```

## Troubleshooting

### Sessions Not Being Saved

```bash
# Check which repo sessions belong to
$ gitify-prompt daemon status

# Look for "Repo: ..." field
Session Details:
  abc12345
    Repo: ~/project1    ← Should match your git repo
```

### Wrong Repo Sessions Saved

```bash
# Ensure cwd matches repo root
$ pwd
/Users/you/project1

$ git rev-parse --show-toplevel
/Users/you/project1    ← Should match!
```

### Sessions From Multiple Repos Mixed

```bash
# This is normal! Daemon serves all repos.
# But on commit, only relevant sessions are saved.

$ gitify-prompt daemon status

Sessions by Repository:
  ~/project1: 2 sessions
  ~/project2: 1 session    ← Normal to see multiple repos

# When you commit in project1:
$ cd ~/project1
$ git commit -m "..."
✓ Captured 2 session(s)    ← Only project1 sessions
```

## Summary

```
┌────────────────────────────────────────────────┐
│         Single Global Daemon                    │
│                                                 │
│  Handles ALL repos                             │
│  Sessions tagged with repo path               │
│  Commit saves only that repo's sessions       │
│                                                │
│  Benefits:                                     │
│  • One process for everything                 │
│  • No session mixing                          │
│  • Works with multiple IDE instances          │
│  • Smart filtering on commits                 │
└────────────────────────────────────────────────┘
```

**You can work on as many repos as you want, and the daemon intelligently handles all of them!** 🎉
