# Bumpcraft

[![npm version](https://img.shields.io/npm/v/bumpcraft.svg)](https://www.npmjs.com/package/bumpcraft)
[![npm downloads](https://img.shields.io/npm/dt/bumpcraft.svg)](https://www.npmjs.com/package/bumpcraft)
[![license](https://img.shields.io/npm/l/bumpcraft.svg)](https://github.com/ayush-jadaun/bumpcraft/blob/main/LICENSE)

Pluggable semantic versioning and changelog automation engine. Automates version bumping, changelog generation, and release management through a pipeline architecture with swappable plugins.

## Features

- **Automatic version bumping** from Conventional Commits (`feat:`, `fix:`, `BREAKING CHANGE`)
- **Changelog generation** in Markdown or JSON (or write your own formatter)
- **GitHub Releases** integration
- **Release preview dashboard** — web UI showing pending changes and next version
- **Release groups** — batch commits into named releases
- **Interactive mode** — review and edit changelog before releasing
- **Release policies** — approval gates, freeze windows, rate limits
- **Queryable history** — search past releases by scope, type, breaking changes
- **Pluggable everything** — parsers, formatters, release providers are all swappable

## Quick Start

```bash
# Install
npm install bumpcraft

# Initialize config
npx bumpcraft init

# Preview what a release would do
npx bumpcraft validate

# Release
npx bumpcraft release
```

## Documentation

- [Installation Guide](docs/installation.md)
- [CLI Reference](docs/cli-reference.md)
- [Configuration](docs/configuration.md)
- [REST API](docs/api-reference.md)
- [Plugin Development](docs/plugins.md)
- [Library API](docs/library-api.md)
- [Release Groups](docs/release-groups.md)
- [Release Policies](docs/release-policies.md)
- [History & Querying](docs/history.md)
- [Dashboard](docs/dashboard.md)
- [Monorepo Support](docs/monorepo.md)
- [Publishing](docs/publishing.md)
- [Changeset Files](docs/changesets.md)
- [Version PR Mode](docs/version-pr.md)
- [Lifecycle Hooks](docs/hooks.md)
- [Docker Deployment](docs/docker.md)
- [Deployment Guide](docs/deployment.md)
- [Architecture](docs/architecture.md)

## How It Works

1. You write commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(auth): add OAuth2 support
   fix(api): handle null response
   feat!: redesign user API    # breaking change
   ```

2. Run `bumpcraft release`. The pipeline:
   - **Parses** commits since the last tag
   - **Resolves** the bump type (`major` > `minor` > `patch`)
   - **Generates** a changelog
   - **Creates** a git tag and GitHub release
   - **Records** the release in queryable history

3. Done. Version bumped, changelog written, release published.

## License

MIT
