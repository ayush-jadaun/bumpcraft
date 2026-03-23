# Monorepo Support

Bumpcraft supports monorepos with independent versioning per package, scoped commits, inter-package dependency tracking, and linked package groups.

## Setup

### Option 1: Auto-detect from workspaces (zero config)

If your root `package.json` has a `workspaces` field, bumpcraft auto-detects packages:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*"]
}
```

Bumpcraft reads the workspace glob, finds all directories with a `package.json`, and registers them as monorepo packages. Supports npm, pnpm (`pnpm-workspace.yaml`), and yarn workspace formats.

If both `pnpm-workspace.yaml` and `package.json` workspaces exist, `package.json` takes precedence.

Name collisions (e.g. `packages/cache-adapters/memory` and `packages/db-adapters/memory`) are resolved by prefixing with the parent directory name.

### Option 2: Explicit config

Add `monorepo` to `.bumpcraftrc.json`:

```json
{
  "monorepo": {
    "auth": { "path": "packages/auth" },
    "api": { "path": "packages/api" },
    "ui": { "path": "packages/ui", "tagFormat": "@scope/ui@{version}" }
  }
}
```

Each package has:
- `path` — relative path to the package directory (must contain `package.json`)
- `tagFormat` — optional custom tag format (default: `{name}@{version}`)

## How It Works

### Commit scoping

Bumpcraft uses commit scopes to determine which package a commit affects:

```
feat(auth): add OAuth support    → bumps auth only
fix(api): timeout bug            → bumps api only
feat: global feature             → bumps ALL packages
chore: update deps               → no bump (chore type)
```

- **Scoped commits** (`feat(auth):`) only bump the matching package
- **Unscoped commits** (`feat:`) apply to ALL packages
- **Unknown scopes** (`feat(database):`) are ignored if no package matches

### Version independence

Each package reads from its **own** `package.json`:

```
packages/auth/package.json  → version: "1.0.0"
packages/api/package.json   → version: "2.5.0"
```

A `fix:` commit bumps auth to `1.0.1` and api to `2.5.1` independently.

### What gets created per package

- Version bump in `packages/{name}/package.json`
- `packages/{name}/CHANGELOG.md` (per-package, no cross-contamination)
- Git tag: `auth@1.0.1`, `api@2.5.1`
- History entry: `auth@1.0.1` in `.bumpcraft/history.json`

## CLI

```bash
# Release all changed packages
bumpcraft release

# Release a specific package
bumpcraft release --package auth

# Preview what would change
bumpcraft status

# Dry run
bumpcraft release --dry-run

# Publish all to npm (skips private packages)
bumpcraft publish

# Publish one package
bumpcraft publish --package auth
```

## Inter-Package Dependencies

When a package is released, bumpcraft automatically updates the dependency version in any package that depends on it.

```json
// packages/app/package.json BEFORE
{ "dependencies": { "@mono/core": "^1.0.0" } }

// After core releases 1.1.0:
{ "dependencies": { "@mono/core": "^1.1.0" } }
```

This works for `dependencies`, `devDependencies`, and `peerDependencies`.

**Note:** `workspace:*`, `workspace:^`, and `workspace:~` references are never modified — pnpm handles the replacement at publish time.

## Linked Packages

Linked packages always release at the same version. If one package gets a major bump and another gets a patch, both get the major version.

```json
{
  "monorepo": {
    "compiler": { "path": "packages/compiler" },
    "runtime": { "path": "packages/runtime" }
  },
  "linked": [["compiler", "runtime"]]
}
```

Example: `compiler` gets `feat!:` (major → 2.0.0), `runtime` gets `fix:` (patch → 1.0.1). Since they're linked, both become `2.0.0`.

## Private Packages

Private packages (`"private": true` in `package.json`) are:
- **Versioned** during release (they need versions for internal dependency tracking)
- **Skipped** by `bumpcraft publish` (not published to npm)

## CI Integration

```yaml
- name: Release all packages
  run: npx bumpcraft release --approve --push
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}

- name: Publish to npm
  run: npx bumpcraft publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Full Config Example

```json
{
  "versionSource": "package.json",
  "plugins": [
    "bumpcraft-plugin-conventional-commits",
    "bumpcraft-plugin-changelog-md",
    "bumpcraft-plugin-github"
  ],
  "monorepo": {
    "core": { "path": "packages/core" },
    "cli": { "path": "packages/cli" },
    "web": { "path": "packages/web" }
  },
  "linked": [["core", "cli"]],
  "commitTypes": { "feat": "minor", "fix": "patch" },
  "policies": {
    "requireApproval": ["major"],
    "freezeAfter": "friday 17:00"
  }
}
```
