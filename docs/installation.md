# Installation Guide

## Requirements

- Node.js 20 or later
- Git installed and available in PATH
- A git repository with at least one commit

## Install via npm

```bash
# Global install (recommended for CLI usage)
npm install -g bumpcraft

# Or as a dev dependency in your project
npm install --save-dev bumpcraft
```

## Setup

### 1. Initialize configuration

Run this in your project root:

```bash
bumpcraft init
```

This creates `.bumpcraftrc.json` with sensible defaults.

### 2. Start using Conventional Commits

Bumpcraft reads your git commit messages to determine version bumps. Use the format:

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

Common types:

| Type | Bump | Example |
|------|------|---------|
| `feat` | minor | `feat: add dark mode` |
| `fix` | patch | `fix: crash on login` |
| `feat!` or `BREAKING CHANGE` | major | `feat!: redesign API` |
| `chore`, `docs`, `test`, `style`, `refactor` | none | `chore: update deps` |

### 3. Create your first release

```bash
# Preview what would happen
bumpcraft validate

# Actually release
bumpcraft release
```

## Verify Installation

```bash
# Check version
bumpcraft --version

# Show help
bumpcraft --help

# Show current project version
bumpcraft version
```

## Uninstall

```bash
npm uninstall -g bumpcraft
```

## Building from Source

```bash
git clone <repo-url>
cd bumpcraft
npm install
npm run build
npm link  # makes 'bumpcraft' available globally
```

## Running Tests

```bash
npm test                # run all tests
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```
