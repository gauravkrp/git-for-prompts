# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-10-05

### Added
- **CLI Commands**
  - `gitify-prompt list` - List all captured prompts with filters (--branch, --author, --since, --limit)
  - `gitify-prompt show <sha>` - View full conversations with --json and --files options
  - `gitify-prompt web` - Generate static HTML dashboard with --open option
  - `gitify-prompt init` - Initialize .prompts/ directory and install git hooks

- **Web Dashboard**
  - Static HTML dashboard generator with beautiful responsive UI
  - Client-side search and filtering by branch, author
  - Individual prompt pages with full conversation history
  - GitHub Pages ready (no backend required)
  - Tailwind-inspired CSS styling

- **Core Libraries**
  - `PromptReader` class for reading and querying .prompts/ directory
  - Support for filtering by branch, author, date range
  - Full SHA and short SHA (7-char) support

- **Automatic Conversation Capture**
  - Zero-effort capture of Claude Code conversations
  - Real-time session saving (not on exit)
  - Multi-session support (capture multiple Claude instances)
  - Branch tracking (current branch + parent branch detection)
  - Git author tracking
  - Pasted content preservation

- **Git Integration**
  - Pre-commit hook to add prompts to commits
  - Post-commit hook to link sessions with commit SHAs
  - Automatic Husky detection and integration
  - Works with any git commit tool (GitHub Desktop, VS Code, Terminal)

- **Documentation**
  - Comprehensive README with quick start guide
  - CLI-IMPLEMENTATION-PLAN.md for CLI architecture
  - WEB-DASHBOARD-DESIGN.md for web options
  - NEXTJS-APP-ROADMAP.md for future SaaS app
  - AUTO-PUBLISH.md for GitHub Actions setup

- **Package Publishing**
  - Published to npm as `gitify-prompt`
  - MIT License
  - Wrapper script (bin/claude-wrapper.sh) for conversation capture
  - GitHub Actions workflow for auto-publishing on version changes

### Dependencies
- `cli-table3` - Terminal table rendering
- `date-fns` - Date formatting and relative time
- `chalk` - Terminal colors
- `commander` - CLI framework
- `open` - Open browser from CLI
- `fs-extra` - File system utilities
- `js-yaml` - YAML parsing
- `inquirer` - Interactive prompts
- `ora` - Terminal spinners
- And more...

### Technical Details
- **Node.js**: >=18.0.0 required
- **Package Size**: 54.0 kB (248.3 kB unpacked)
- **Files**: 72 files in package
- **Architecture**: In-process daemon with NODE_OPTIONS hook
- **Conversation Storage**: Reads from `~/.claude/projects/*.jsonl`
- **Session Storage**: `.prompts/prompts/*.json` + `.prompts/.meta/`

---

## Future Releases

See [TODO.md](./TODO.md) for planned features:

- **v0.1.1** - Bug fixes and end-to-end testing
- **v0.2.0** - Testing infrastructure (`gitify-prompt test`)
- **v0.3.0** - Multi-provider support (OpenAI, local LLMs)
- **v0.4.0** - NextJS SaaS dashboard (hosted version)
- **v1.0.0** - Production ready with full test coverage

---

[Unreleased]: https://github.com/gauravkrp/git-for-prompts/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gauravkrp/git-for-prompts/releases/tag/v0.1.0
