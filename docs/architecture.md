# Architecture

## Overview

Bumpcraft is built on a **pipeline architecture** where every step of the release process is a pluggable stage.

```
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐    ┌────────┐
│  Parse  │ → │ Resolve │ → │ Changelog │ → │ Release │ → │ Notify │
└─────────┘    └─────────┘    └───────────┘    └─────────┘    └────────┘
    ↑              ↑               ↑               ↑             ↑
  plugin         plugin          plugin          plugin        plugin
```

Each stage is a slot filled by one or more plugins. The `PipelineRunner` orchestrates execution, passing a shared `PipelineContext` through each stage.

## Project Structure

```
src/
├── core/                 # Foundation — no dependencies on other src/ modules
│   ├── errors.ts         # BumpcraftError + ErrorCode enum
│   ├── logger.ts         # Logger interface + ConsoleLogger
│   ├── semver.ts         # SemVer immutable value object
│   ├── config.ts         # Zod schema + config loader
│   ├── bump-resolver.ts  # Determines bump type from commits
│   ├── git-client.ts     # Thin wrapper around simple-git
│   └── version-source.ts # VersionSource interface + implementations
│
├── pipeline/             # Pipeline orchestration
│   ├── types.ts          # ParsedCommit, PipelineContext, BumpcraftPlugin interfaces
│   └── runner.ts         # PipelineRunner — stage ordering, early exit, error isolation
│
├── plugins/              # Built-in plugins
│   ├── conventional-commits.ts  # Parse stage
│   ├── changelog-md.ts          # Changelog stage (Markdown)
│   ├── changelog-json.ts        # Changelog stage (JSON)
│   └── github.ts                # Release stage (GitHub API)
│
├── policies/             # Release policy engine
│   └── policy-engine.ts
│
├── groups/               # Release group management
│   └── group-manager.ts
│
├── history/              # Queryable changelog database
│   └── history-store.ts
│
├── cli/                  # Commander CLI
│   ├── index.ts          # Entry point
│   ├── interactive.ts    # Interactive prompt + editor integration
│   └── commands/         # One file per command
│
├── api/                  # Express REST API
│   ├── app.ts            # Express app factory
│   ├── server.ts         # Server entry point
│   ├── middleware/        # Auth middleware
│   └── routes/           # One file per route group
│
├── dashboard/            # Release preview UI
│   └── index.html        # Single-file dashboard
│
└── index.ts              # Library public API
```

## Dependency Flow

```
index.ts (public API)
  ├── core/* (foundation)
  ├── pipeline/* (orchestration)
  ├── plugins/* (built-in)
  └── history/* (storage)

cli/* (CLI layer)
  ├── index.ts (public API)
  ├── policies/* (policy checks)
  └── groups/* (group management)

api/* (HTTP layer)
  ├── index.ts (public API)
  └── history/* (queries)
```

Key principle: **core/ has no dependencies on other src/ modules** (except errors.ts which everything depends on). This means `SemVer`, `BumpcraftError`, and other core types can be used standalone.

## Pipeline Details

### Stage Execution Order

```
parse → resolve → changelog → release → notify
```

### Early Exit

If `bumpType` is `'none'` after the resolve stage (no relevant commits), the runner skips changelog, release, and notify stages entirely.

### Dry Run

In `dryRun` mode, the release and notify stages are skipped. Parse, resolve, and changelog still run so you can preview the output.

### Error Isolation

If a plugin throws, the runner wraps it in a `BumpcraftError` with code `PLUGIN_FAILED`, including which stage and plugin failed.

### NextVersion Computation

A synthetic internal plugin (`bumpcraft-internal-next-version`) runs at the end of the resolve stage. It reads `bumpType` from the context and computes `nextVersion` by bumping the current version accordingly. This keeps the version computation inside the pipeline rather than as a separate step.

## Design Decisions

1. **Pipeline over events** — the release process is sequential. A pipeline models this naturally and is easier to reason about than an event system.

2. **Pluggable everything** — parsers, formatters, release providers are all plugins. The core only orchestrates.

3. **Stateless API** — no database. Git is the source of truth. The API reads from git and config files directly.

4. **Single-package first** — designed for one version per repo. The architecture supports future monorepo extension (VersionSource and PipelineContext can be scoped per-package).

5. **Config in files** — `.bumpcraftrc.json` lives in the repo, versioned with the code. The API doesn't manage config.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (ESM) |
| Runtime | Node.js 20+ |
| CLI | Commander |
| API | Express.js |
| Git | simple-git |
| Config | Zod |
| Tests | Vitest + Supertest |
| Interactive | readline (Node.js built-in) |
