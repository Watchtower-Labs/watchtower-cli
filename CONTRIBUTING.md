# Contributing to Watchtower

Thank you for your interest in contributing to Watchtower! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Style Guide](#style-guide)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a welcoming and inclusive environment. Be respectful, constructive, and considerate in all interactions.

## Getting Started

1. **Fork the repository** on [GitHub](https://github.com/Watchtower-Labs/watchtower-cli)
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/watchtower-cli.git
   cd watchtower-cli
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Watchtower-Labs/watchtower-cli.git
   ```

## Development Setup

### Prerequisites

- **Node.js** 20 (use `nvm use` with included `.nvmrc`)
- **pnpm** 8+ (recommended)
- **Python** 3.10+ (for SDK development)
- **Git**

### CLI Development

```bash
# Clone the repository
git clone https://github.com/Watchtower-Labs/watchtower-cli.git
cd watchtower-cli

# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Build the CLI
pnpm build:cli

# Watch mode (rebuild on changes)
pnpm dev:cli

# Run type checking
pnpm typecheck

# Run linter
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Run tests
pnpm test

# Run CLI directly
node packages/cli/dist/index.js show last

# Or link globally for development
cd packages/cli && pnpm link --global
watchtower --help
```

### SDK Development

```bash
# From repository root
cd watchtower-cli

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=watchtower

# Enable debug mode
WATCHTOWER_DEBUG=1 python your_script.py
```

## Project Structure

```
watchtower-cli/
├── watchtower/                 # Python SDK package
│   ├── __init__.py            # Public API exports
│   ├── plugin.py              # ADK plugin implementation
│   ├── exceptions.py          # Custom exception hierarchy
│   ├── config.py              # Configuration management
│   ├── cleanup.py             # Trace retention utilities
│   ├── models/                # Event dataclasses
│   │   └── events.py          # Event types with schema versioning
│   ├── utils/                 # Utilities
│   │   ├── sanitization.py    # Data sanitization
│   │   └── serialization.py   # JSON encoding
│   └── writers/               # Event writers
│       └── file_writer.py     # JSONL file writer
├── packages/
│   └── cli/                   # TypeScript CLI (Ink/React)
│       ├── src/
│       │   ├── index.tsx      # Entry point
│       │   ├── commands/      # CLI commands (show, tail, list, config, clean)
│       │   ├── components/    # React/Ink UI components
│       │   ├── hooks/         # Custom React hooks
│       │   ├── lib/           # Utilities (parser, theme, config, bookmarks)
│       │   └── __tests__/     # Test files
│       ├── dist/              # Compiled output
│       └── package.json
├── examples/                  # Usage examples
├── tests/                     # SDK tests
├── .github/workflows/         # CI/CD pipelines
├── pyproject.toml            # Python package config
├── package.json              # Root monorepo config
├── .nvmrc                    # Node.js version
├── CONTRIBUTING.md
└── README.md
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/cli/src/index.tsx` | CLI entry point with yargs command routing |
| `packages/cli/src/commands/` | Command implementations |
| `packages/cli/src/hooks/useProcessStream.ts` | Python process spawning and event streaming |
| `packages/cli/src/hooks/useTraceFile.ts` | Trace file loading and parsing |
| `packages/cli/src/lib/parser.ts` | NDJSON and JSON-RPC parsing |
| `packages/cli/src/lib/types.ts` | TypeScript type definitions |

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-export-command`
- `fix/timestamp-parsing`
- `docs/update-readme`
- `refactor/split-event-detail`

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons)
- `refactor` - Code change that neither fixes nor adds
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(cli): add export command for CSV output
fix(parser): handle malformed timestamps gracefully
docs(readme): add troubleshooting section
refactor(components): split EventDetail into sub-components
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run CLI tests only
pnpm --filter @watchtower/cli test

# Run with coverage (if configured)
pnpm test -- --coverage
```

### Writing Tests

Tests use [AVA](https://github.com/avajs/ava) and are located alongside source files or in a `test/` directory.

```typescript
// Example test
import test from 'ava';
import {parseLine} from './parser.js';

test('parseLine parses valid JSONL', t => {
  const result = parseLine('{"type":"run.start","run_id":"abc","timestamp":123}');
  t.is(result?.type, 'run.start');
  t.is(result?.run_id, 'abc');
});

test('parseLine returns null for invalid JSON', t => {
  const result = parseLine('not json');
  t.is(result, null);
});
```

### Testing Components

Use [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) for component tests:

```typescript
import test from 'ava';
import {render} from 'ink-testing-library';
import {Header} from './Header.js';

test('Header displays run ID', t => {
  const {lastFrame} = render(<Header runId="abc123" />);
  t.true(lastFrame()?.includes('abc123'));
});
```

## Submitting a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on [GitHub](https://github.com/Watchtower-Labs/watchtower-cli/pulls)

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue (if any)
   - Screenshots/recordings for UI changes
   - Testing instructions

4. **Address review feedback** promptly

### PR Checklist

- [ ] Code follows the style guide
- [ ] Tests pass locally (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] No console.log or debug statements
- [ ] TypeScript strict mode passes

## Style Guide

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer `interface` over `type` for objects
- Use explicit return types on exported functions
- Avoid `any` - use `unknown` and type guards

```typescript
// Good
interface TraceEvent {
  type: string;
  run_id: string;
  timestamp: number;
}

export function parseLine(line: string): TraceEvent | null {
  // ...
}

// Avoid
export function parseLine(line: string): any {
  // ...
}
```

### React/Ink Components

- Use functional components with hooks
- Props interfaces should be explicit
- Destructure props in function signature

```typescript
// Good
interface HeaderProps {
  runId: string;
  live?: boolean;
  status?: ProcessStatus;
}

export function Header({runId, live, status}: HeaderProps): React.ReactElement {
  // ...
}
```

### Formatting

The project uses Prettier with the [Sindresorhus config](https://github.com/sindresorhus/prettier-config):

- Tabs for indentation
- Single quotes
- No semicolons
- Trailing commas

```bash
# Format code
pnpm prettier --write .

# Check formatting
pnpm prettier --check .
```

### Linting

ESLint with [XO](https://github.com/xojs/xo) and React rules:

```bash
# Lint code
pnpm xo

# Lint and fix
pnpm xo --fix
```

## Reporting Issues

### Bug Reports

When [reporting a bug](https://github.com/Watchtower-Labs/watchtower-cli/issues/new), include:

1. **Environment**:
   - OS and version
   - Node.js version (`node --version`)
   - CLI version (`watchtower --version`)

2. **Steps to reproduce**:
   - Minimal example that triggers the bug
   - Commands run
   - Expected vs actual behavior

3. **Error output**:
   - Full error message/stack trace
   - Relevant log output

### Feature Requests

When [requesting a feature](https://github.com/Watchtower-Labs/watchtower-cli/issues/new):

1. **Use case**: Why do you need this feature?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: Other approaches you've thought of
4. **Additional context**: Screenshots, mockups, references

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/Watchtower-Labs/watchtower-cli/discussions)
- **Bugs**: Open an [Issue](https://github.com/Watchtower-Labs/watchtower-cli/issues)
- **Security**: Email security@watchtower-labs.com (do not open public issues)

## Recognition

Contributors are recognized in:
- Git commit history
- Release notes
- README acknowledgments (for significant contributions)

Thank you for contributing to Watchtower!
