# Contributing to Bumpcraft

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/ayush-jadaun/bumpcraft.git
cd bumpcraft
npm install
npm test          # run tests
npm run dev       # run CLI in dev mode (via tsx)
npm run build     # compile TypeScript
npm start         # start API server
```

## Project Structure

```
src/
  core/           # SemVer, config, git client, version source, errors, logger
  pipeline/       # Pipeline types and runner
  plugins/        # Built-in plugins (conventional-commits, changelog-md/json, github)
  policies/       # Release policy engine
  history/        # Release history store
  groups/         # Release group manager
  api/            # Express REST API + middleware + routes
  cli/            # Commander CLI + commands
  dashboard/      # Single-file web dashboard
tests/
  unit/           # Unit tests
  integration/    # Integration tests (API, full pipeline)
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Bumpcraft uses itself for releases.

```
feat: add new feature          # minor bump
fix: fix a bug                 # patch bump
feat!: breaking change         # major bump
docs: update readme            # no bump
chore: update deps             # no bump
test: add tests                # no bump
```

## Running Tests

```bash
npm test                # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

Tests are written with [Vitest](https://vitest.dev/). Integration tests create temporary git repos and run the full pipeline.

## Adding a Plugin

1. Create `src/plugins/your-plugin.ts`
2. Implement the `BumpcraftPlugin` interface:

```typescript
import type { BumpcraftPlugin, PipelineContext } from '../pipeline/types.js'

export const myPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-my-plugin',
  stage: 'changelog',  // one of: parse, resolve, changelog, release, notify
  async execute(context: PipelineContext): Promise<PipelineContext> {
    // your logic here
    return { ...context, changelogOutput: '...' }
  }
}
```

3. Register it in `src/index.ts` in the `BUILT_IN_PLUGINS` map
4. Add tests in `tests/unit/plugins/`

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Write your code with tests
3. Make sure `npm test` passes (77+ tests)
4. Make sure `npm run lint` passes (no type errors)
5. Use conventional commit messages
6. Open a PR against `main`

## Reporting Bugs

Open an issue at [github.com/ayush-jadaun/bumpcraft/issues](https://github.com/ayush-jadaun/bumpcraft/issues) with:

- What you expected
- What happened instead
- Steps to reproduce
- Your Node.js version and OS

## Feature Requests

Open an issue with the `enhancement` label describing your use case and why the feature would be useful.
