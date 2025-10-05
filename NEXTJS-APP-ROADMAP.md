# NextJS App Roadmap - Gitify Prompt SaaS

**Separate Repository:** `gitify-prompt-web`
**Tech Stack:** Next.js 14 + App Router + Tailwind + Shadcn/ui + Supabase/PostgreSQL
**Deployment:** Vercel
**Timeline:** After CLI has 100+ active users

---

## Product Vision

**Tagline:** "GitHub for AI Prompts - Version control, review, and share your LLM conversations"

**Core Value Props:**
1. View any public GitHub repo's prompts (if they use gitify-prompt)
2. Private dashboard for your own prompts across all repos
3. Team collaboration (share prompts, review together)
4. Analytics (prompt quality, usage patterns)

---

## Architecture

### Public Features (No Login)
```
app.gitify-prompt.com/
├── /                           # Landing page + marketing
├── /docs                       # Documentation
├── /pricing                    # Pricing page
├── /blog                       # Blog posts
└── /view/[owner]/[repo]        # View public repo's prompts
```

### Private Features (GitHub OAuth)
```
app.gitify-prompt.com/
├── /login                      # GitHub OAuth
├── /dashboard                  # User dashboard
│   ├── /repos                  # List of user's repos
│   ├── /prompts                # All user's prompts
│   ├── /teams                  # Team management
│   └── /settings               # User settings
└── /[owner]/[repo]             # Private repo view
```

---

## Phase 1: MVP (Weeks 1-2)

### Features
- [x] Landing page (marketing)
- [x] GitHub OAuth login
- [x] View public repo prompts
- [x] Basic prompt list/detail pages
- [x] Simple search

### Tech Stack
```json
{
  "framework": "Next.js 14 (App Router)",
  "styling": "Tailwind CSS + Shadcn/ui",
  "auth": "NextAuth.js with GitHub provider",
  "database": "Supabase (PostgreSQL)",
  "deployment": "Vercel",
  "analytics": "Vercel Analytics"
}
```

### Database Schema (Supabase)

```sql
-- Users (from GitHub OAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Repositories
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL, -- "owner/name"
  is_public BOOLEAN DEFAULT true,
  github_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner, name)
);

-- Prompts (synced from repos)
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID REFERENCES repositories(id),
  commit_sha TEXT NOT NULL,
  branch TEXT,
  parent_branch TEXT,
  author_name TEXT,
  author_email TEXT,
  messages JSONB NOT NULL, -- Array of conversation messages
  files_modified JSONB, -- Array of file changes
  metadata JSONB, -- Extra metadata
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repository_id, commit_sha)
);

-- User access to repos
CREATE TABLE user_repos (
  user_id UUID REFERENCES users(id),
  repository_id UUID REFERENCES repositories(id),
  role TEXT DEFAULT 'viewer', -- viewer, editor, admin
  PRIMARY KEY(user_id, repository_id)
);

-- Teams (future)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Routes

```typescript
// app/api/repos/[owner]/[repo]/prompts/route.ts
GET /api/repos/:owner/:repo/prompts
  → List prompts for a repo
  → Query params: ?branch=X&author=Y&limit=50

GET /api/repos/:owner/:repo/prompts/:sha
  → Get specific prompt detail

POST /api/repos/:owner/:repo/sync
  → Sync prompts from GitHub repo
  → Requires authentication

// app/api/user/route.ts
GET /api/user/repos
  → Get user's repos

GET /api/user/prompts
  → Get all user's prompts across repos
```

---

## Phase 2: Team Features (Weeks 3-4)

### Features
- [ ] Team workspaces
- [ ] Invite team members
- [ ] Shared prompt collections
- [ ] Comments on prompts
- [ ] Prompt approval workflow

### Database Changes

```sql
-- Team members
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role TEXT DEFAULT 'member', -- member, admin
  PRIMARY KEY(team_id, user_id)
);

-- Team repos
CREATE TABLE team_repos (
  team_id UUID REFERENCES teams(id),
  repository_id UUID REFERENCES repositories(id),
  PRIMARY KEY(team_id, repository_id)
);

-- Prompt comments
CREATE TABLE prompt_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES prompts(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 3: Analytics & Insights (Weeks 5-6)

### Features
- [ ] Prompt usage analytics
- [ ] Quality scoring (message count, file changes)
- [ ] Team productivity metrics
- [ ] Popular prompts (most viewed)
- [ ] Trending topics

### UI Components
- Dashboard charts (recharts)
- Heatmap of prompt activity
- Team leaderboard
- Prompt quality badges

---

## Phase 4: Advanced Features (Weeks 7-8)

### Features
- [ ] Prompt marketplace (share/sell prompts)
- [ ] Prompt templates
- [ ] AI-powered prompt suggestions
- [ ] Regression detection (output changed)
- [ ] Slack/Discord integration
- [ ] Webhooks for CI/CD

---

## Monetization Strategy

### Free Tier
- Public repos (unlimited)
- Up to 3 private repos
- Basic analytics
- 100 prompts/month

### Pro Tier ($9/month)
- Unlimited private repos
- Unlimited prompts
- Advanced analytics
- Team features (up to 5 members)
- Priority support

### Team Tier ($29/month)
- Everything in Pro
- Unlimited team members
- SSO (future)
- Custom branding
- Dedicated support

### Enterprise (Custom)
- On-premise deployment
- Advanced security
- SLA
- Custom integrations

---

## File Structure

```
gitify-prompt-web/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Marketing layout
│   │   ├── docs/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── blog/
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   │
│   ├── (app)/
│   │   ├── layout.tsx                  # App layout (with sidebar)
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── repos/page.tsx          # User repos
│   │   │   ├── prompts/page.tsx        # All user prompts
│   │   │   ├── teams/page.tsx          # Team management
│   │   │   └── settings/page.tsx       # User settings
│   │   │
│   │   └── [owner]/
│   │       └── [repo]/
│   │           ├── page.tsx            # Repo overview
│   │           ├── prompts/page.tsx    # Prompt list
│   │           └── prompts/[sha]/page.tsx  # Prompt detail
│   │
│   ├── view/
│   │   └── [owner]/
│   │       └── [repo]/
│   │           ├── page.tsx            # Public repo view
│   │           └── prompts/[sha]/page.tsx
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── repos/
│   │   │   └── [owner]/
│   │   │       └── [repo]/
│   │   │           ├── prompts/route.ts
│   │   │           └── sync/route.ts
│   │   └── user/
│   │       ├── repos/route.ts
│   │       └── prompts/route.ts
│   │
│   └── login/page.tsx
│
├── components/
│   ├── marketing/
│   │   ├── hero.tsx
│   │   ├── features.tsx
│   │   ├── pricing-cards.tsx
│   │   └── testimonials.tsx
│   │
│   ├── app/
│   │   ├── sidebar.tsx
│   │   ├── prompt-list.tsx
│   │   ├── prompt-card.tsx
│   │   ├── prompt-detail.tsx
│   │   ├── conversation-view.tsx
│   │   ├── code-diff.tsx
│   │   └── search-bar.tsx
│   │
│   └── ui/                             # Shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
│
├── lib/
│   ├── supabase.ts                     # Supabase client
│   ├── github.ts                       # GitHub API client
│   ├── auth.ts                         # Auth helpers
│   └── utils.ts
│
├── types/
│   ├── database.ts                     # Supabase types
│   └── prompt.ts                       # Prompt types
│
├── public/
│   ├── images/
│   └── fonts/
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Landing Page Design

### Hero Section
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         Git for AI Prompts                                  │
│         ─────────────────                                   │
│                                                             │
│    Version control, review, and share your                  │
│    LLM conversations like code                              │
│                                                             │
│    [Get Started Free]  [View Demo]                          │
│                                                             │
│    ┌───────────────────────────────────────────────┐       │
│    │  > gitify-prompt init                         │       │
│    │  ✓ Prompts repository initialized             │       │
│    │                                                 │       │
│    │  > claude "add authentication"                 │       │
│    │  ✓ Conversation captured automatically         │       │
│    │                                                 │       │
│    │  > git commit -m "Add auth"                    │       │
│    │  ✓ Linked to commit abc123                     │       │
│    └───────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Features Section
- 🤖 Automatic capture (Claude Code, Cursor)
- 💬 Full conversations (prompts + responses)
- 🔗 Git integration (linked to commits)
- 👥 Team collaboration
- 📊 Analytics & insights
- 🔍 Search & filter

### Pricing Section
[Free] → [Pro $9/mo] → [Team $29/mo] → [Enterprise]

---

## GitHub OAuth Setup

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo', // Access to repos
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Save user to Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select()
        .eq('github_id', profile.id)
        .single();

      if (!existingUser) {
        await supabase.from('users').insert({
          github_id: profile.id,
          username: profile.login,
          email: user.email,
          avatar_url: user.image,
        });
      }

      return true;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## Public Repo Viewing Flow

### User visits: `app.gitify-prompt.com/view/gauravkrp/git-prompts`

**Backend flow:**
1. Check if repo exists in database
2. If not, fetch from GitHub API
3. Look for `.prompts/web/data.json` in repo
4. Parse and display prompts
5. Cache for 1 hour

**Code:**
```typescript
// app/view/[owner]/[repo]/page.tsx
export async function generateMetadata({ params }) {
  return {
    title: `${params.owner}/${params.repo} - Gitify Prompt`,
  };
}

export default async function PublicRepoPage({ params }) {
  const { owner, repo } = params;

  // Fetch prompts from GitHub
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/.prompts/web/data.json`;
  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    return <div>This repo doesn't have gitify-prompt set up</div>;
  }

  const prompts = await response.json();

  return (
    <div>
      <h1>{owner}/{repo}</h1>
      <PromptList prompts={prompts} />
    </div>
  );
}
```

---

## CLI Integration with Web App

### User syncs prompts to web app:

```bash
# In CLI
gitify-prompt login
# Opens browser → GitHub OAuth → Returns token

gitify-prompt sync
# Uploads .prompts/prompts/*.json to web app
# POST /api/repos/:owner/:repo/sync
```

**Backend:**
```typescript
// app/api/repos/[owner]/[repo]/sync/route.ts
export async function POST(req: Request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompts } = await req.json();

  // Insert/update prompts in database
  for (const prompt of prompts) {
    await supabase.from('prompts').upsert({
      repository_id: repoId,
      commit_sha: prompt.metadata.commitSha,
      branch: prompt.metadata.branch,
      author_name: prompt.author?.name,
      messages: prompt.messages,
      files_modified: prompt.filesModified,
      metadata: prompt.metadata,
    });
  }

  return Response.json({ success: true, count: prompts.length });
}
```

---

## Development Timeline

### Week 1: Setup & MVP
- [ ] Create NextJS project
- [ ] Set up Tailwind + Shadcn/ui
- [ ] Landing page
- [ ] GitHub OAuth
- [ ] Supabase setup

### Week 2: Core Features
- [ ] Public repo viewing
- [ ] Dashboard layout
- [ ] Prompt list/detail pages
- [ ] Search functionality

### Week 3: Team Features
- [ ] Team creation
- [ ] Invite members
- [ ] Shared workspaces

### Week 4: Polish & Launch
- [ ] Analytics dashboard
- [ ] Pricing page
- [ ] Payment integration (Stripe)
- [ ] Deploy to Vercel
- [ ] Public beta

---

## Success Metrics

### Phase 1 (Month 1)
- 100 signups
- 50 active users
- 10 paying customers

### Phase 2 (Month 3)
- 1,000 signups
- 500 active users
- 50 paying customers
- $500 MRR

### Phase 3 (Month 6)
- 10,000 signups
- 5,000 active users
- 500 paying customers
- $5,000 MRR

---

## Risk Mitigation

### Technical Risks
- **GitHub API rate limits**: Cache aggressively, use webhooks
- **Data storage costs**: Compress prompts, archive old data
- **Performance**: Use Vercel Edge, Supabase connection pooling

### Business Risks
- **User adoption**: Focus on CLI first, web is bonus
- **Monetization**: Freemium model, low barrier to entry
- **Competition**: Open source CLI, proprietary web app

---

## Open Questions

1. **Privacy**: How to handle sensitive prompts?
   → Encryption at rest, private-by-default

2. **Sharing**: Public/private prompt sharing model?
   → GitHub-style: public repos = public prompts

3. **Search**: Full-text search across millions of prompts?
   → Use Supabase full-text search or Algolia

4. **Scalability**: How to handle 1M+ prompts?
   → Partition by repo, archive old data

---

## Next Steps (After CLI Launch)

1. Set up `gitify-prompt-web` repo
2. Create Vercel project
3. Set up Supabase project
4. Implement landing page
5. Launch private beta

**ETA:** 4 weeks after CLI has 100+ users
