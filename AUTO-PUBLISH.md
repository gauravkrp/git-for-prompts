# Auto-Publish to npm on Push to Main

This repository is configured to automatically publish to npm when the version in `package.json` changes on the `main` branch.

## How It Works

1. **Version Change Detection**: When you push to `main`, GitHub Actions checks if the version in `package.json` changed
2. **Build & Test**: If version changed, it installs dependencies, builds, and runs tests
3. **Publish to npm**: Automatically publishes the new version to npm
4. **Create GitHub Release**: Creates a GitHub release with the version tag

## Setup Instructions

### 1. Generate npm Automation Token

**Important:** Use an **Automation Token** (not a Classic Token) to bypass 2FA requirements.

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click **"Generate New Token"**
3. Select **"Automation"** (not "Publish" or "Classic")
4. Name it: `github-actions-gitify-prompt`
5. Click **"Generate Token"**
6. **Copy the token immediately** (you won't see it again!)

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository: https://github.com/gauravkrp/git-for-prompts
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste the npm automation token
6. Click **"Add secret"**

### 3. Verify Workflow File

The workflow is already set up in `.github/workflows/publish.yml`.

It triggers when:
- Push to `main` branch
- Files changed: `package.json`, `src/**`, or `bin/**`
- Version in `package.json` changed

## Publishing a New Version

### Option 1: Using npm version (Recommended)

```bash
# Patch version (0.1.0 → 0.1.1)
npm version patch -m "fix: bug fixes"

# Minor version (0.1.0 → 0.2.0)
npm version minor -m "feat: new features"

# Major version (0.1.0 → 1.0.0)
npm version major -m "feat!: breaking changes"

# Push with tags
git push && git push --tags
```

This will:
1. Update `package.json` version
2. Create a git commit
3. Create a git tag
4. Push to GitHub triggers the workflow
5. Auto-publish to npm

### Option 2: Manual Version Update

```bash
# Edit package.json manually
# Change: "version": "0.1.0" → "version": "0.1.1"

git add package.json
git commit -m "chore: bump version to 0.1.1"
git push origin main
```

This triggers the workflow and auto-publishes.

## Workflow Status

Check workflow status:
- **Actions tab**: https://github.com/gauravkrp/git-for-prompts/actions
- **Workflow runs**: See all publish attempts
- **Logs**: Debug any failures

## Workflow File Location

`.github/workflows/publish.yml`

## What Gets Published

The workflow runs:
1. `npm ci` - Clean install dependencies
2. `npm run build` - Compile TypeScript
3. `npm test` - Run tests (if available)
4. `npm publish` - Publish to npm registry

Same files as defined in `.npmignore`.

## Troubleshooting

### "Error: 401 Unauthorized"

**Cause:** NPM_TOKEN is invalid or expired.

**Fix:**
1. Generate a new npm automation token
2. Update the `NPM_TOKEN` secret in GitHub

### "Error: You cannot publish over the previously published versions"

**Cause:** Version in `package.json` already exists on npm.

**Fix:**
1. Bump the version: `npm version patch`
2. Push again: `git push && git push --tags`

### Workflow doesn't trigger

**Cause:** Version didn't change in `package.json`.

**Fix:**
1. Ensure `package.json` version is different from previous commit
2. Check workflow triggers in `.github/workflows/publish.yml`

### Test failures block publish

**Current behavior:** Tests run but failures don't block publish (`|| true`)

**To make tests required:**
```yaml
- name: Run tests
  run: npm test  # Remove "|| true"
```

## Security Notes

- **Never commit npm tokens** to git
- Use **Automation tokens** (not Classic tokens) to bypass 2FA
- Tokens are stored securely in GitHub Secrets
- Only repo admins can view/edit secrets

## Disable Auto-Publish

To disable auto-publishing:

1. Delete the workflow file:
   ```bash
   git rm .github/workflows/publish.yml
   git commit -m "chore: disable auto-publish"
   git push
   ```

2. Or rename it:
   ```bash
   mv .github/workflows/publish.yml .github/workflows/publish.yml.disabled
   ```

## Manual Publishing

You can always publish manually:

```bash
npm version patch
npm publish
git push && git push --tags
```

---

## Example Workflow

1. Make changes to code
2. Commit changes: `git commit -m "feat: add new feature"`
3. Bump version: `npm version minor` (creates commit + tag)
4. Push: `git push && git push --tags`
5. GitHub Actions automatically:
   - Detects version change
   - Builds and tests
   - Publishes to npm
   - Creates GitHub release

---

**Next version:** 0.1.1 → 0.2.0 (when you're ready!)
