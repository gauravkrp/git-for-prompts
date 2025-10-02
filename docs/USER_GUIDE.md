# Git for Prompts - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [Workflow Examples](#workflow-examples)
5. [Testing Strategies](#testing-strategies)
6. [Team Collaboration](#team-collaboration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Introduction

### What is Git for Prompts?

Git for Prompts is a version control system for LLM prompts. Just as Git revolutionized code management, Git for Prompts brings the same rigor to prompt engineering.

### Why Do I Need This?

If you're working with LLMs, you've likely experienced:
- **Prompt Drift**: "The prompt worked yesterday, what changed?"
- **Testing Uncertainty**: "Will this change break existing functionality?"
- **Collaboration Chaos**: "Who changed this prompt and why?"
- **Deployment Fear**: "Is this prompt ready for production?"

Git for Prompts solves these problems by treating prompts as code.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key (or other supported LLM provider)
- Basic familiarity with command line

### Installation

```bash
# Install globally
npm install -g git-prompts

# Or run the quickstart script
./quickstart.sh
```

### First-Time Setup

1. **Initialize your prompt repository:**
```bash
prompt init
```

2. **Configure your environment:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
OPENAI_API_KEY=sk-your-key-here
```

3. **Create your first prompt:**
```bash
prompt commit my-first-prompt \
  -m "Initial prompt for task X" \
  -c "You are a helpful assistant..." \
  --model gpt-4 \
  --tags tutorial,example
```

## Core Concepts

### Prompts as Artifacts

In Git for Prompts, each prompt is:
- **Versioned**: Every change creates a new version
- **Immutable**: Historical versions never change
- **Testable**: Each version can be tested independently
- **Diffable**: Changes between versions are trackable

### Prompt Structure

```yaml
# A prompt consists of:
id: unique-identifier           # Never changes
version: abc123                  # Auto-generated hash
content: The actual prompt text  # What gets sent to LLM
metadata:                        # Configuration
  model: gpt-4
  temperature: 0.7
tests:                          # Validation rules
  - type: output
    description: Should work
```

### Repository Structure

```
your-project/
├── .prompts/           # Your prompt repository
│   ├── prompts/        # Current versions
│   ├── history/        # All versions
│   └── outputs/        # Test results
├── src/                # Your application code
└── .env               # API keys (gitignored)
```

## Workflow Examples

### Daily Prompt Development

#### Morning: Start New Feature
```bash
# Check current prompts
prompt list

# Create new prompt for feature
prompt commit email-classifier \
  -m "Add email classification prompt" \
  --model gpt-4
```

#### Afternoon: Iterate and Test
```bash
# Test the prompt
prompt test email-classifier

# View results, make changes
prompt commit email-classifier \
  -m "Improve classification accuracy"

# Compare versions
prompt diff email-classifier
```

#### Evening: Review Changes
```bash
# See what changed today
prompt history email-classifier

# Compare morning vs evening versions
prompt diff email-classifier \
  --from morning-version \
  --to evening-version \
  --output
```

### Team Collaboration Workflow

#### Developer A: Creates Prompt
```bash
# Create and test locally
prompt commit customer-support \
  -m "Initial support agent prompt"

prompt test customer-support

# Push to GitHub
git add .prompts/
git commit -m "Add customer support prompt"
git push origin feature-branch
```

#### Developer B: Reviews Changes
```bash
# Pull changes
git pull origin feature-branch

# Review the prompt
prompt history customer-support

# Test locally
prompt test customer-support --verbose

# Suggest improvements
prompt commit customer-support \
  -m "Add politeness constraints"
```

#### CI/CD: Automated Testing
The GitHub Action automatically:
1. Runs tests on PR
2. Posts diff in comments
3. Blocks merge if tests fail

### Production Deployment Workflow

```bash
# 1. Tag stable version
prompt history production-prompt
# Note the version hash

# 2. Create deployment script
echo "PROMPT_VERSION=abc123" > .env.production

# 3. In production, load specific version
prompt get production-prompt --version abc123
```

## Testing Strategies

### Types of Tests

#### 1. Output Validation
Ensures prompt generates valid responses:
```yaml
tests:
  - type: output
    description: Should generate response
```

#### 2. Content Validation
Checks for required elements:
```yaml
tests:
  - type: contains
    description: Must mention refund policy
    keywords:
      - refund
      - 30 days
      - money back
```

#### 3. Length Constraints
Controls response size:
```yaml
tests:
  - type: length
    description: Keep it concise
    min: 100
    max: 500
```

#### 4. Pattern Matching
Validates format:
```yaml
tests:
  - type: regex
    description: Should be valid JSON
    pattern: '^\{.*\}$'
```

### Testing Best Practices

1. **Test Early and Often**
```bash
# Run tests after every change
prompt test my-prompt
```

2. **Use Regression Testing**
```bash
# Test all prompts before deployment
prompt test --verbose
```

3. **Compare Outputs**
```bash
# Always check output differences
prompt diff my-prompt --output
```

4. **Set Up CI/CD**
```yaml
# .github/workflows/prompt-tests.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: prompt test
```

## Team Collaboration

### Setting Up for Teams

1. **Shared Repository Structure**
```bash
# Option 1: Prompts in main repo
your-app/
├── .prompts/
├── src/
└── README.md

# Option 2: Separate prompt repo
prompts-repo/
└── .prompts/
```

2. **Access Control**
```bash
# Use git branch protection
# Require PR reviews for prompt changes
# Set up CODEOWNERS file
```

3. **Naming Conventions**
```
# Use clear, descriptive IDs
✅ customer-onboarding-email
✅ code-review-assistant
❌ prompt1
❌ test
```

### Code Review Process

1. **Creating a PR**
```bash
# Create feature branch
git checkout -b improve-email-prompt

# Make changes
prompt commit email-template \
  -m "Add personalization"

# Push and create PR
git add .prompts/
git commit -m "Improve email template"
git push origin improve-email-prompt
```

2. **Reviewing Changes**
- Check the automated diff comment
- Review test results
- Run locally if needed
- Approve or request changes

### Conflict Resolution

When multiple people edit the same prompt:

```bash
# Pull latest changes
git pull origin main

# If conflicts in .prompts/
prompt history conflicted-prompt

# Review both versions
prompt diff conflicted-prompt \
  --from their-version \
  --to your-version

# Decide on final version
prompt commit conflicted-prompt \
  -m "Merge improvements from both versions"
```

## Best Practices

### Prompt Design

1. **Version Everything**
   - Every production prompt should be in version control
   - Never edit prompts directly in production

2. **Write Clear Commit Messages**
```bash
# Good
prompt commit parser -m "Add JSON output format support"

# Bad
prompt commit parser -m "Update"
```

3. **Use Semantic Versioning in Tags**
```bash
# Tag releases
git tag prompts-v1.0.0
git tag prompts-v1.0.1-hotfix
```

### Testing

1. **Test Against Multiple Models**
```bash
prompt test my-prompt --model gpt-4
prompt test my-prompt --model gpt-3.5-turbo
```

2. **Create Test Suites**
```yaml
# .prompts/test-suites/regression.yaml
suites:
  - name: critical-paths
    prompts:
      - customer-support
      - email-classifier
    models: [gpt-4, gpt-3.5-turbo]
```

3. **Monitor Costs**
```bash
# Track token usage in tests
prompt test --verbose | grep "Tokens:"
```

### Security

1. **Never Commit API Keys**
```bash
# Always use .env
echo ".env" >> .gitignore
```

2. **Sanitize Sensitive Prompts**
```yaml
# Use placeholders
content: |
  Process payment for customer: [CUSTOMER_ID]
  Amount: [AMOUNT]
```

3. **Rotate Versions Regularly**
```bash
# Don't let prompts get stale
prompt history my-prompt --limit 50
# Archive old versions periodically
```

## Troubleshooting

### Common Issues

#### "No prompts repository found"
```bash
# Solution: Initialize repository
prompt init
```

#### "API key not configured"
```bash
# Solution: Set environment variable
export OPENAI_API_KEY=sk-your-key
# Or add to .env file
```

#### "Test failures after model update"
```bash
# Solution: Regenerate baseline
prompt test my-prompt --update-baseline
prompt diff my-prompt --output
```

#### "Merge conflicts in .prompts/"
```bash
# Solution: Use prompt tools, not git
prompt history conflicted-prompt
prompt diff conflicted-prompt --from base --to head
# Manually merge best parts
```

### Performance Issues

#### Slow Tests
```bash
# Run specific tests only
prompt test specific-prompt

# Use caching
export PROMPT_CACHE=true

# Test locally with smaller models
prompt test --model gpt-3.5-turbo
```

#### Large History
```bash
# Archive old versions
mkdir .prompts-archive
mv .prompts/history/old-prompt .prompts-archive/

# Limit history queries
prompt history my-prompt --limit 10
```

### Getting Help

1. **Check Documentation**
```bash
prompt --help
prompt commit --help
```

2. **View Examples**
```bash
ls examples/
cat examples/user-onboarding.yaml
```

3. **Debug Mode**
```bash
DEBUG=* prompt test my-prompt
```

4. **Report Issues**
- GitHub Issues: github.com/your-org/git-prompts/issues
- Documentation: docs/

## Advanced Usage

### Automation

```bash
# Batch testing
for prompt in $(prompt list | awk '{print $1}'); do
  prompt test $prompt
done

# Scheduled regression tests
crontab -e
# 0 2 * * * cd /project && prompt test >> test.log
```

### Integration with Applications

```javascript
// Load specific prompt version
const { PromptStore } = require('git-prompts');
const store = new PromptStore();

const prompt = await store.getPrompt('my-prompt', 'abc123');
const response = await callLLM(prompt.content);
```

### Custom Test Types

```javascript
// Extend test runner
class CustomRunner extends LLMRunner {
  async runCustomTest(prompt, test) {
    // Your validation logic
  }
}
```

## Next Steps

1. **Set up your first repository**: `prompt init`
2. **Create a prompt**: Follow the examples
3. **Add tests**: Define success criteria
4. **Integrate CI/CD**: Use GitHub Actions
5. **Collaborate**: Share with your team

Remember: Prompts are code. Version them, test them, review them.