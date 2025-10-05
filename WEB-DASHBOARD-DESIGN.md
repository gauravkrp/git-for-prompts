# Web Dashboard Design

**Goal:** Visualize captured prompts, conversations, and changes in a web UI

---

## Architecture Options

### Option 1: Local Server (Recommended)
```bash
gitify-prompt serve
# Opens http://localhost:3000
```

**Pros:**
- Simple deployment (just run command)
- No infrastructure needed
- Works offline
- Full access to local .prompts/ files

**Cons:**
- Only for individual use (not team collaboration yet)
- Need to keep server running

**Tech Stack:**
- **Backend:** Express.js (lightweight, already using Node)
- **Frontend:** React + Vite (fast, modern)
- **Styling:** Tailwind CSS (rapid prototyping)
- **Components:** Shadcn/ui (beautiful, accessible)

---

### Option 2: Static Site Generator
```bash
gitify-prompt export --web
# Generates static HTML in .prompts/web/
# Open .prompts/web/index.html
```

**Pros:**
- No server needed
- Can commit to repo
- Deploy to GitHub Pages easily

**Cons:**
- Rebuild on every new prompt
- No real-time updates
- Limited interactivity

---

### Option 3: Hosted Dashboard (Future)
```
https://app.gitify-prompt.com
# SaaS version with team features
```

**Pros:**
- Team collaboration
- Hosted infrastructure
- Advanced features (search, analytics)

**Cons:**
- Requires backend service
- Privacy concerns (data leaves local machine)
- Subscription model needed

---

## Recommended: Option 1 (Local Server)

**Rationale:**
1. Fastest to implement
2. Best UX (real-time, interactive)
3. No privacy concerns (local-only)
4. Foundation for future team features

---

## Implementation Plan

### Phase 1: Minimal Viable Dashboard (Week 1)

**Command:**
```bash
gitify-prompt serve [--port 3000]
```

**Features:**
- List all prompts (reverse chronological)
- View individual prompt details
- Search by commit SHA, branch, author
- Basic conversation display

**API Endpoints:**
```typescript
GET /api/prompts              // List all prompts
GET /api/prompts/:sha         // Get specific prompt
GET /api/branches             // List branches with prompt counts
GET /api/authors              // List authors with prompt counts
GET /api/search?q=...         // Search prompts
```

**UI Pages:**
```
/                    → Prompt list
/prompts/:sha        → Prompt details (conversation + files)
/branches            → Browse by branch
/authors             → Browse by author
```

---

### Phase 2: Enhanced Viewing (Week 2)

**Features:**
- Side-by-side conversation + code changes
- Syntax highlighting for code
- Diff view for file changes
- Filter by date range
- Export individual prompts

**UI Improvements:**
- Code syntax highlighting (Prism.js or Shiki)
- Markdown rendering for assistant responses
- Copy button for code blocks
- Timeline view

---

### Phase 3: Advanced Features (Week 3-4)

**Features:**
- Prompt comparison (diff two prompts)
- Branch visualization (tree view)
- Statistics dashboard
  - Prompts per day/week
  - Most modified files
  - Author contribution
- Tag prompts manually
- Add notes to prompts

**UI:**
- Graph visualizations (recharts or Chart.js)
- Advanced filtering
- Keyboard shortcuts
- Dark mode

---

## Tech Stack Details

### Backend (Express.js)

**File structure:**
```
src/server/
├── index.ts           # Express app
├── routes/
│   ├── prompts.ts     # Prompt endpoints
│   ├── branches.ts    # Branch endpoints
│   └── search.ts      # Search endpoints
├── services/
│   ├── prompt-reader.ts   # Read .prompts/ directory
│   └── git-utils.ts       # Git commands
└── types.ts           # Shared types
```

**Dependencies:**
```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "compression": "^1.7.4"
}
```

**Example endpoint:**
```typescript
// src/server/routes/prompts.ts
import { Router } from 'express';
import { PromptReader } from '../services/prompt-reader';

const router = Router();
const reader = new PromptReader();

router.get('/api/prompts', async (req, res) => {
  const prompts = await reader.listAll();
  res.json(prompts);
});

router.get('/api/prompts/:sha', async (req, res) => {
  const prompt = await reader.getBySha(req.params.sha);
  if (!prompt) return res.status(404).json({ error: 'Not found' });
  res.json(prompt);
});

export default router;
```

---

### Frontend (React + Vite)

**File structure:**
```
src/web/
├── public/            # Static assets
├── src/
│   ├── App.tsx        # Main app
│   ├── main.tsx       # Entry point
│   ├── pages/
│   │   ├── PromptList.tsx
│   │   ├── PromptDetail.tsx
│   │   ├── BranchView.tsx
│   │   └── AuthorView.tsx
│   ├── components/
│   │   ├── ConversationView.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── FileChanges.tsx
│   │   ├── SearchBar.tsx
│   │   └── FilterPanel.tsx
│   ├── hooks/
│   │   ├── usePrompts.ts
│   │   └── useSearch.ts
│   ├── lib/
│   │   └── api.ts     # API client
│   └── styles/
│       └── globals.css
├── index.html
├── vite.config.ts
└── package.json
```

**Dependencies:**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "tailwindcss": "^3.4.0",
  "@tanstack/react-query": "^5.0.0",
  "prismjs": "^1.29.0",
  "date-fns": "^3.0.0"
}
```

---

## UI Mockups (Text Version)

### Prompt List Page
```
┌─────────────────────────────────────────────────────────┐
│  Gitify Prompt Dashboard                         [Dark] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search prompts............................]  [Filter]│
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🔵 feat: Add authentication                      │ │
│  │ abc123de • feature-auth ← main                   │ │
│  │ @gaurav • 2 hours ago • 3 messages • 5 files    │ │
│  │ "Add JWT authentication with refresh tokens..."  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🟢 fix: Database connection pooling              │ │
│  │ def456gh • main                                  │ │
│  │ @gaurav • 5 hours ago • 7 messages • 2 files    │ │
│  │ "Fix database connection leak in production..." │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Prompt Detail Page
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to list              feat: Add authentication   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Commit: abc123de                    Branch: feature-auth│
│  Author: @gaurav                     Date: 2 hours ago  │
│  Messages: 3                         Files: 5           │
│                                                         │
│  ┌─────────────────────┬─────────────────────────────┐ │
│  │ 💬 Conversation     │ 📝 Code Changes            │ │
│  ├─────────────────────┼─────────────────────────────┤ │
│  │ 👤 You:             │ ✏️ src/auth/jwt.ts         │ │
│  │ Add JWT             │ + import jwt from 'jsonweb..│ │
│  │ authentication      │ + const secret = process...│ │
│  │                     │                             │ │
│  │ 🤖 Claude:          │ ✏️ src/auth/middleware.ts  │ │
│  │ I'll implement JWT  │ + export function authMid...│ │
│  │ with refresh tokens │ + const token = req.hea...│ │
│  │ ...                 │                             │ │
│  └─────────────────────┴─────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Development Roadmap

### Week 1: Foundation
- [ ] Set up Express server
- [ ] Create API endpoints
- [ ] Set up Vite + React
- [ ] Build PromptList component
- [ ] Basic routing

### Week 2: Core Features
- [ ] PromptDetail page
- [ ] Conversation rendering
- [ ] Code syntax highlighting
- [ ] Search functionality
- [ ] Branch filtering

### Week 3: Polish
- [ ] Responsive design
- [ ] Dark mode
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

### Week 4: Advanced
- [ ] Diff view
- [ ] Statistics dashboard
- [ ] Export functionality
- [ ] Keyboard shortcuts

---

## Minimal Starting Point (Can build today)

```typescript
// src/commands/serve.ts
import express from 'express';
import fs from 'fs';
import path from 'path';

export async function serveCommand(options: { port?: number }) {
  const app = express();
  const port = options.port || 3000;
  const promptsDir = path.join(process.cwd(), '.prompts', 'prompts');

  // API: List all prompts
  app.get('/api/prompts', (req, res) => {
    const files = fs.readdirSync(promptsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = JSON.parse(fs.readFileSync(path.join(promptsDir, f), 'utf-8'));
        return {
          sha: content.metadata.commitSha,
          branch: content.metadata.branch,
          author: content.author?.name,
          messageCount: content.messages.length,
          fileCount: content.filesModified.length,
          timestamp: content.startTime
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(files);
  });

  // Serve static HTML
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gitify Prompt Dashboard</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
          <h1 class="text-3xl font-bold mb-4">Gitify Prompt Dashboard</h1>
          <div id="prompts"></div>
          <script>
            fetch('/api/prompts')
              .then(r => r.json())
              .then(prompts => {
                document.getElementById('prompts').innerHTML = prompts.map(p =>
                  '<div class="bg-white p-4 mb-2 rounded shadow">' +
                  '<div class="font-bold">' + p.sha + '</div>' +
                  '<div class="text-sm text-gray-600">' + p.branch + ' • ' + p.author + '</div>' +
                  '<div class="text-sm">' + p.messageCount + ' messages • ' + p.fileCount + ' files</div>' +
                  '</div>'
                ).join('');
              });
          </script>
        </body>
      </html>
    `);
  });

  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}
```

This gives you a working dashboard in **~50 lines of code**.

---

## Long-Term Vision

**Team Features (SaaS):**
- Team workspaces
- Real-time collaboration
- Prompt sharing marketplace
- Analytics across team
- Access control

**Advanced Features:**
- AI-powered prompt suggestions
- Prompt quality scoring
- Regression detection (output changed)
- Integration with CI/CD
- Slack/Discord notifications

---

## Next Steps (Your Decision)

**Option A: Build minimal dashboard now**
- ~1 day to get basic UI working
- Use simple Express + inline HTML (like mockup above)
- Can iterate later

**Option B: Proper architecture from start**
- ~1 week to set up Vite + React properly
- Better foundation for future features
- More maintainable

**Option C: Focus on core features first**
- Implement `list`, `show`, `diff` CLI commands first
- Build web dashboard after CLI is solid
- Validate workflow before building UI

**My recommendation: Option C** → Build CLI commands first, then dashboard.

Want me to implement Option A (minimal dashboard) to show you how it works?
