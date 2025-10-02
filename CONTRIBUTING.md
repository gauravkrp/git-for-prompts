# Contributing to Git for Prompts

First off, thank you for considering contributing to Git for Prompts! It's people like you that make Git for Prompts such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [project email].

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. See error

**Expected behavior**
What you expected to happen.

**Screenshots/Logs**
If applicable, add screenshots or logs.

**Environment:**
 - OS: [e.g. macOS, Ubuntu]
 - Node version: [e.g. 18.0.0]
 - Git for Prompts version: [e.g. 0.1.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use case**: Why is this enhancement needed?
- **Proposed solution**: How do you envision it working?
- **Alternative solutions**: What other approaches did you consider?
- **Additional context**: Any other information or screenshots

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- `good-first-issue` - issues which should only require a few lines of code
- `help-wanted` - issues which need extra attention

### Pull Requests

1. **Fork the repo** and create your branch from `main`.
2. **Make your changes** and ensure they follow our coding standards.
3. **Add tests** if you've added code that should be tested.
4. **Ensure the test suite passes** by running `npm test`.
5. **Update documentation** if you've changed APIs.
6. **Submit your pull request!**

## Development Process

### Setting Up Your Environment

```bash
# Clone your fork
git clone https://github.com/your-username/git-prompts.git
cd git-prompts

# Install dependencies
npm install

# Create a branch
git checkout -b my-feature

# Set up environment
cp .env.example .env
# Add your API keys to .env
```

### Project Structure

```
git-prompts/
├── src/
│   ├── cli/          # CLI entry point
│   ├── commands/     # Command implementations
│   └── lib/          # Core libraries
├── docs/             # Documentation
├── examples/         # Example prompts
├── tests/            # Test files
└── vscode-extension/ # VS Code extension
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "PromptStore"

# Run with coverage
npm run test:coverage
```

### Code Style

We use ESLint for JavaScript linting:

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Style Guidelines:**
- Use ES6+ features
- Async/await over callbacks
- Meaningful variable names
- JSDoc comments for all public methods
- 2 spaces for indentation

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(cli): add support for Anthropic Claude models"
git commit -m "fix(store): handle missing version gracefully"
git commit -m "docs: update API documentation for v2"
```

### Testing Your Changes

1. **Unit Tests**: Test individual components
```javascript
// src/lib/__tests__/prompt-store.test.js
describe('PromptStore', () => {
  it('should save prompt with version', async () => {
    // Test implementation
  });
});
```

2. **Integration Tests**: Test command workflows
```bash
# Test CLI commands
./src/cli/index.js init
./src/cli/index.js commit test-prompt -m "Test"
```

3. **Manual Testing**: Test the full workflow
```bash
# Install locally
npm link

# Test commands
prompt init
prompt commit my-test
prompt test my-test
```

## Adding New Features

### Adding a New Command

1. Create command file in `src/commands/`
```javascript
// src/commands/my-command.js
export async function myCommand(options) {
  // Implementation
}
```

2. Register in CLI
```javascript
// src/cli/index.js
program
  .command('my-command')
  .description('Description')
  .action(myCommand);
```

3. Add documentation
- Update README.md
- Add to docs/API.md
- Create examples

### Adding a New Test Type

1. Extend LLMRunner
```javascript
// src/lib/llm-runner.js
async runMyTest(prompt, test) {
  // Test implementation
}
```

2. Add to test runner switch
```javascript
case 'mytest':
  return await this.runMyTest(prompt, test);
```

3. Document the test type
- Add to docs/API.md
- Create example in examples/

### Adding a New LLM Provider

1. Add provider client
```javascript
// src/lib/providers/anthropic.js
export class AnthropicProvider {
  async complete(prompt, options) {
    // API implementation
  }
}
```

2. Integrate in LLMRunner
```javascript
// src/lib/llm-runner.js
if (model.startsWith('claude')) {
  return await this.anthropic.complete(prompt, options);
}
```

3. Update documentation
- Add to supported models list
- Document environment variables
- Add examples

## Documentation

### Documentation Structure

```
docs/
├── ARCHITECTURE.md    # System design
├── API.md            # API reference
├── USER_GUIDE.md     # User documentation
└── DEPLOYMENT.md     # Deployment guide
```

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep it up to date with code changes

### Generating API Docs

```bash
# Generate JSDoc documentation
npm run docs:generate

# Preview documentation
npm run docs:serve
```

## Release Process

1. **Version Bump**
```bash
npm version patch|minor|major
```

2. **Update Changelog**
```markdown
## [0.2.0] - 2024-01-15
### Added
- Support for Anthropic Claude models
### Fixed
- Memory leak in test runner
```

3. **Create Release PR**
- Title: `Release v0.2.0`
- Include changelog in description
- Tag reviewers

4. **After Merge**
```bash
git tag v0.2.0
git push origin v0.2.0
npm publish
```

## Community

### Getting Help

- **Discord**: [Join our server]
- **GitHub Discussions**: Ask questions
- **Stack Overflow**: Tag with `git-prompts`

### Staying Updated

- Watch the repository for updates
- Subscribe to our newsletter
- Follow us on Twitter

## Recognition

Contributors are recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes

## Questions?

Feel free to:
- Open an issue for questions
- Reach out on Discord
- Email the maintainers

Thank you for contributing to Git for Prompts! 🎉