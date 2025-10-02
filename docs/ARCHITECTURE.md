# Architecture Documentation - Git for Prompts

## Overview

Git for Prompts is a version control system specifically designed for managing Large Language Model (LLM) prompts. It brings software engineering best practices to the emerging field of prompt engineering by treating prompts as first-class code artifacts.

## Core Concepts

### What Problem Does This Solve?

In modern AI development, prompts are becoming as critical as code, but teams lack proper tools to:
- **Version Control**: Track changes to prompts over time
- **Code Review**: Review prompt changes before deployment
- **Testing**: Ensure prompts behave consistently across versions
- **Collaboration**: Share and iterate on prompts as a team
- **CI/CD**: Automate prompt testing in deployment pipelines

### Key Innovation

Unlike traditional prompt management tools that focus on UI-based editing or simple storage, Git for Prompts provides:
1. **Git-native workflow** - Prompts live in your repository
2. **CLI-first approach** - Integrates with existing dev workflows
3. **Deterministic testing** - Reproducible prompt behavior
4. **Multi-model support** - Test across different LLM providers

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interfaces                         │
├───────────────┬─────────────────┬──────────────┬───────────┤
│      CLI      │   VS Code Ext   │  GitHub Action│ Web UI*  │
└───────┬───────┴────────┬────────┴──────┬───────┴───────────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Core Libraries                            │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐           ┌──────────────────┐         │
│  │  Prompt Store   │           │   LLM Runner     │         │
│  │                 │           │                  │         │
│  │ - Version mgmt  │           │ - Model adapters │         │
│  │ - History       │           │ - Test execution │         │
│  │ - Diffing       │           │ - Metrics        │         │
│  └─────────────────┘           └──────────────────┘         │
└────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Storage Layer                             │
├──────────────────────────────────────────────────────────────┤
│  .prompts/                                                   │
│  ├── config.yaml       # Repository configuration            │
│  ├── prompts/          # Current versions (YAML)             │
│  ├── history/          # Version history                     │
│  └── outputs/          # Generated outputs for diffing       │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  External Services                           │
├──────────────────────────────────────────────────────────────┤
│  • OpenAI API         • Anthropic API*                       │
│  • Local LLMs*        • Custom Models*                       │
└──────────────────────────────────────────────────────────────┘

* Planned features
```

## Data Flow

### 1. Prompt Commit Flow
```
User Input → CLI → Prompt Store → YAML File → History → Index Update
```

### 2. Test Execution Flow
```
Test Command → Load Prompt → LLM Runner → API Call → Response →
Test Validation → Results → Output Storage
```

### 3. Diff Generation Flow
```
Diff Command → Load Versions → Content Diff → Output Comparison →
Display Results
```

## File Structure

### Repository Layout
```
project/
├── .prompts/                  # Prompt repository (git-tracked or ignored)
│   ├── config.yaml           # Repository configuration
│   ├── prompts/              # Current prompt versions
│   │   └── {id}.yaml        # Individual prompt files
│   ├── history/              # Version history
│   │   └── {id}/            # Per-prompt history
│   │       └── {timestamp}-{version}.yaml
│   ├── outputs/              # Test outputs
│   │   └── {id}/
│   │       └── {version}.json
│   └── .meta/                # Metadata
│       └── index.json        # Prompt index
├── src/                      # Source code
│   ├── cli/                  # CLI entry point
│   ├── commands/             # Command implementations
│   └── lib/                  # Core libraries
└── .env                      # API keys (never committed)
```

### Prompt Schema (YAML)

```yaml
# Prompt file structure (.prompts/prompts/{id}.yaml)
id: string                    # Unique identifier
version: string               # Version hash
timestamp: ISO8601            # Creation time
lastModified: ISO8601         # Last modification
content: string               # The actual prompt text
commitMessage: string         # Commit message
description: string           # Brief description

metadata:
  model: string              # Target model (gpt-4, claude-3, etc.)
  temperature: number        # Temperature setting (0-1)
  maxTokens: number          # Max response tokens
  tags: string[]             # Categorization tags

tests:                       # Test specifications
  - type: string             # Test type (output, regex, contains, length)
    description: string      # Test description
    # Type-specific fields...
```

## Components

### CLI (src/cli/index.js)
- Entry point for command-line interface
- Built with Commander.js
- Handles command routing and option parsing

### Commands (src/commands/)
- **init.js**: Initialize new prompt repository
- **commit.js**: Save/update prompts
- **diff.js**: Compare prompt versions
- **history.js**: View version history
- **list.js**: List all prompts
- **test.js**: Run prompt tests

### Libraries (src/lib/)

#### PromptStore (prompt-store.js)
Responsibilities:
- YAML serialization/deserialization
- Version management
- History tracking
- Index maintenance
- Output storage

Key Methods:
- `init()`: Initialize repository
- `savePrompt()`: Commit new version
- `getPrompt()`: Retrieve prompt by ID/version
- `getHistory()`: Get version history
- `listPrompts()`: List with filters

#### LLMRunner (llm-runner.js)
Responsibilities:
- LLM API integration
- Test execution
- Response validation
- Metrics collection

Key Methods:
- `runPrompt()`: Execute prompt against LLM
- `runTests()`: Execute test suite
- `compareOutputs()`: Diff two outputs

## Security Considerations

### API Key Management
- Keys stored in `.env` file (gitignored)
- Never committed to repository
- Environment variable injection in CI/CD

### Prompt Security
- Prompts may contain sensitive information
- Consider encryption for sensitive prompts
- Use private repositories for proprietary prompts

### Rate Limiting
- Implement retry logic with backoff
- Cache outputs to reduce API calls
- Batch testing for efficiency

## Performance Optimizations

### Caching Strategy
- Output caching for repeated tests
- History index for fast lookups
- Lazy loading for large histories

### Scalability
- File-based storage scales to thousands of prompts
- Parallel test execution support
- Incremental diffing for large prompts

## Extension Points

### Adding New LLM Providers
1. Extend `LLMRunner` class
2. Add provider-specific API client
3. Implement adapter interface
4. Map model names to providers

### Custom Test Types
1. Add test type to runner
2. Implement validation logic
3. Define schema in documentation
4. Update CLI help text

### Integration Adapters
- REST API wrapper (planned)
- GraphQL interface (planned)
- Webhook notifications (planned)
- Slack/Discord bots (planned)

## Future Architecture Enhancements

### Phase 2: Collaboration Features
- Web dashboard for team review
- Real-time collaboration
- Approval workflows
- Role-based access control

### Phase 3: Advanced Testing
- A/B testing framework
- Statistical analysis
- Performance benchmarks
- Cost optimization

### Phase 4: Enterprise Features
- SSO integration
- Audit logging
- Compliance controls
- On-premise deployment