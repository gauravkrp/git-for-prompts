# Publishing to npm

This guide covers how to publish Git for Prompts to npm so users can install with `npm install -g git-for-prompts`.

## Prerequisites

- npm account (create at https://www.npmjs.com/signup)
- Verified email on npm
- Access to publish (package owner or contributor)

## Pre-Publishing Checklist

### 1. Update Package Info

Check `package.json`:

```json
{
  "name": "git-for-prompts",
  "version": "0.1.0",
  "description": "Git for Prompts - Version control, review, and test LLM prompts like code",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/gauravkrp/git-for-prompts.git"
  },
  "keywords": [
    "prompt",
    "llm",
    "git",
    "version-control",
    "ai",
    "prompts",
    "testing",
    "claude",
    "cursor",
    "automation"
  ]
}
```

### 2. Test Locally

```bash
# Build
npm run build

# Test linking
npm link
prompt --version

# Test in another directory
cd /tmp
prompt init
prompt daemon status

# Unlink
npm unlink -g git-for-prompts
```

### 3. Check Files to be Published

```bash
# See what will be published
npm pack --dry-run

# Should include:
# - dist/           (compiled JS)
# - cursor-extension/
# - README.md
# - GETTING-STARTED.md
# - AUTOMATION.md
# - IMPLEMENTATION.md
# - LICENSE
# - package.json
```

### 4. Add .npmignore (if needed)

Create `.npmignore`:
```
# Source files (we publish dist/)
src/
*.ts
!dist/**/*.d.ts

# Development
.git/
.github/
node_modules/
.env
.env.example

# Tests
test/
*.test.js

# Misc
.DS_Store
TODO.md
```

### 5. Update Version

```bash
# For releases:
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0
```

## Publishing Steps

### 1. Login to npm

```bash
npm login
# Enter username, password, email, OTP
```

### 2. Publish (First Time)

```bash
# Check package name availability
npm view git-for-prompts

# If available, publish
npm publish --access public
```

**Note:** First publish must use `--access public` for scoped packages.

### 3. Publish Updates

For subsequent releases:

```bash
# Update version
npm version patch   # or minor/major

# Build
npm run build

# Publish
npm publish
```

## After Publishing

### 1. Update README

Remove the "not yet published" warning:

**Before:**
```markdown
**⚠️ This package is not yet published to npm. Install from source:**
```

**After:**
```markdown
## Installation

```bash
npm install -g git-for-prompts
```
```

### 2. Update GETTING-STARTED.md

Change installation instructions:

**Before:**
```bash
git clone https://github.com/gauravkrp/git-for-prompts.git
cd git-for-prompts
npm install && npm run build && npm link
```

**After:**
```bash
npm install -g git-for-prompts
```

### 3. Create GitHub Release

```bash
# Tag the release
git tag -a v0.1.0 -m "Release v0.1.0: Automatic prompt capture"
git push origin v0.1.0

# Create release on GitHub
gh release create v0.1.0 \
  --title "v0.1.0: Automatic Prompt Capture" \
  --notes "See CHANGELOG.md for details"
```

### 4. Announce

- Tweet/share on social media
- Post on Reddit (r/programming, r/MachineLearning)
- Share on Hacker News
- Write blog post
- Update product hunt

## Publishing the Cursor Extension

### To VS Code Marketplace

1. **Create Publisher Account**
   - Go to https://marketplace.visualstudio.com/manage
   - Create a publisher

2. **Get Personal Access Token**
   ```bash
   # From Azure DevOps with:
   # - All accessible organizations
   # - Marketplace (Manage) scope
   ```

3. **Publish Extension**
   ```bash
   cd cursor-extension

   # Login
   vsce login YOUR-PUBLISHER-NAME

   # Publish
   vsce publish
   ```

### To OpenVSX (for Cursor)

```bash
cd cursor-extension

# Install CLI
npm install -g ovsx

# Login
ovsx login YOUR-ACCESS-TOKEN

# Publish
ovsx publish
```

## Version Numbers

Follow Semantic Versioning (semver):

- **Patch** (0.1.0 → 0.1.1): Bug fixes, minor changes
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup:**
1. Go to https://www.npmjs.com/settings/YOUR-USERNAME/tokens
2. Create new token (Automation)
3. Add to GitHub secrets as `NPM_TOKEN`

## Troubleshooting

### "Package name already taken"

Try variations:
- `git-for-prompts` (preferred)
- `gitforprompts`
- `@your-username/git-for-prompts` (scoped)

### "You must verify your email"

```bash
# Check email status
npm profile get

# Request verification email
npm profile enable-2fa
```

### "ENEEDAUTH"

```bash
# Login again
npm logout
npm login
```

### "Package size too large"

```bash
# Check size
npm pack --dry-run

# Limit to 10MB, add to .npmignore:
# - Large example files
# - Documentation images
# - Unnecessary files
```

## Post-Publish Checklist

- [ ] Package appears on https://www.npmjs.com/package/git-for-prompts
- [ ] `npm install -g git-for-prompts` works
- [ ] `prompt --version` shows correct version
- [ ] README updated on npm page
- [ ] GitHub release created
- [ ] Cursor extension published
- [ ] Documentation updated
- [ ] Announcement posted

## Maintenance

### Regular Updates

```bash
# Update dependencies
npm update

# Check for security issues
npm audit
npm audit fix

# Rebuild
npm run build

# Test
npm test

# Publish
npm version patch
npm publish
```

### Monitor

- npm downloads: https://npm-stat.com/charts.html?package=git-for-prompts
- GitHub issues: https://github.com/gauravkrp/git-for-prompts/issues
- User feedback
- Bug reports

---

**Once published, users can simply run `npm install -g git-for-prompts` and start using it immediately!**
