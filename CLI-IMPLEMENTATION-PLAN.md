# CLI Implementation Plan

## Commands to Implement

### 1. `gitify-prompt list`
List all captured prompts in the current repo.

**Output:**
```
┌─────────┬──────────────────┬────────────┬──────────┬──────────┬──────────────────┐
│ SHA     │ Branch           │ Author     │ Messages │ Files    │ Date             │
├─────────┼──────────────────┼────────────┼──────────┼──────────┼──────────────────┤
│ abc123d │ feature-auth     │ @gaurav    │ 3        │ 5        │ 2 hours ago      │
│ def456g │ main             │ @gaurav    │ 7        │ 2        │ 5 hours ago      │
│ ghi789j │ feature-payment  │ @alice     │ 4        │ 8        │ 1 day ago        │
└─────────┴──────────────────┴────────────┴──────────┴──────────┴──────────────────┘
```

**Filters:**
```bash
gitify-prompt list --branch feature-auth
gitify-prompt list --author gaurav
gitify-prompt list --since "2 days ago"
gitify-prompt list --limit 10
```

**Implementation:** ~100 lines
- Read .prompts/prompts/*.json
- Parse metadata
- Sort by date
- Format as table (use `cli-table3`)

---

### 2. `gitify-prompt show <sha>`
View full conversation and changes for a specific commit.

**Output:**
```
Commit: abc123de4567890
Branch: feature-auth ← main
Author: Gaurav Pandey <gaurav@getthera.com>
Date: 2 hours ago
Messages: 3 • Files: 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Conversation

[10:30:00] You:
Add JWT authentication with refresh tokens

[10:30:05] Claude:
I'll implement JWT authentication with refresh tokens. Here's the approach:
1. Install jsonwebtoken and bcrypt
2. Create auth middleware
3. Implement token generation and verification
...

[10:32:15] You:
Also add rate limiting

[10:32:20] Claude:
I'll add express-rate-limit for API protection...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Files Modified (5)

✏️  src/auth/jwt.ts
✏️  src/auth/middleware.ts
✏️  src/routes/auth.ts
✏️  package.json
✏️  .env.example

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Options:**
```bash
gitify-prompt show <sha> --files  # Show file contents
gitify-prompt show <sha> --json   # Output as JSON
```

**Implementation:** ~150 lines
- Read prompt JSON by SHA
- Format conversation
- Format file list
- Color coding with `chalk`

---

### 3. `gitify-prompt diff <sha1> <sha2>`
Compare two prompts (future - Week 2).

---

### 4. `gitify-prompt web`
Generate static HTML dashboard.

**Output:**
```
Generating web dashboard...
✓ Found 15 prompts
✓ Generated index.html
✓ Generated prompt pages
✓ Copied assets

Dashboard created at: .prompts/web/

Open in browser:
  file:///path/to/.prompts/web/index.html

Or commit and push to GitHub Pages:
  git add .prompts/web/
  git commit -m "Update prompt dashboard"
  git push
```

**What it generates:**
```
.prompts/web/
├── index.html           # Prompt list
├── prompts/
│   ├── abc123.html     # Individual prompt pages
│   ├── def456.html
│   └── ...
├── assets/
│   ├── styles.css      # Tailwind CSS (inline)
│   └── app.js          # Client-side search/filter
└── data.json           # All prompts as JSON
```

**Features:**
- Responsive design (Tailwind)
- Client-side search (no backend needed)
- Dark mode toggle
- Filter by branch/author
- Click prompt → see full conversation

**Implementation:** ~200 lines
- Generate HTML from templates
- Embed all data as JSON
- Copy static assets
- Open in browser

---

## Implementation Order

### Day 1: Foundation
```typescript
// src/lib/prompt-reader.ts
export class PromptReader {
  listAll(): PromptMetadata[]
  getBySha(sha: string): Prompt | null
  getByBranch(branch: string): Prompt[]
  getByAuthor(author: string): Prompt[]
  search(query: string): Prompt[]
}
```

### Day 2: List Command
```typescript
// src/commands/list.ts
export async function listCommand(options: {
  branch?: string;
  author?: string;
  since?: string;
  limit?: number;
}) {
  const reader = new PromptReader();
  const prompts = reader.listAll()
    .filter(/* apply filters */)
    .slice(0, options.limit || 50);

  printTable(prompts);
}
```

### Day 3: Show Command
```typescript
// src/commands/show.ts
export async function showCommand(sha: string, options: {
  files?: boolean;
  json?: boolean;
}) {
  const reader = new PromptReader();
  const prompt = reader.getBySha(sha);

  if (options.json) {
    console.log(JSON.stringify(prompt, null, 2));
  } else {
    printConversation(prompt);
    printFiles(prompt);
  }
}
```

### Day 4: Web Generator
```typescript
// src/commands/web.ts
export async function webCommand(options: {
  open?: boolean;
}) {
  const reader = new PromptReader();
  const prompts = reader.listAll();

  // Generate HTML files
  generateIndex(prompts);
  generatePromptPages(prompts);
  copyAssets();

  if (options.open) {
    open('.prompts/web/index.html');
  }
}
```

---

## Dependencies

```json
{
  "cli-table3": "^0.6.3",      // Tables
  "chalk": "^5.3.0",            // Colors
  "date-fns": "^3.0.0",         // Date formatting
  "open": "^10.0.0"             // Open browser
}
```

---

## Testing Plan

```bash
# Test data setup
mkdir -p test-repo/.prompts/prompts
cp sample-prompts/*.json test-repo/.prompts/prompts/

# Test commands
cd test-repo
gitify-prompt list
gitify-prompt list --branch feature-auth
gitify-prompt show abc123
gitify-prompt web --open
```

---

## Next: Static Site Template

See STATIC-SITE-TEMPLATE.md for HTML template design.
