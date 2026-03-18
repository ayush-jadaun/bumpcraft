# Configuration

Bumpcraft is configured via `.bumpcraftrc.json` in your project root.

## Default Configuration

```json
{
  "versionSource": "package.json",
  "plugins": [
    "bumpcraft-plugin-conventional-commits",
    "bumpcraft-plugin-changelog-md"
  ],
  "branches": {
    "release": ["main", "master"],
    "preRelease": { "develop": "beta", "next": "rc" }
  },
  "commitTypes": {
    "feat": "minor",
    "fix": "patch",
    "perf": "patch",
    "refactor": "none",
    "chore": "none",
    "docs": "none",
    "test": "none",
    "style": "none"
  },
  "policies": {
    "requireApproval": [],
    "autoRelease": ["patch", "minor", "major"],
    "freezeAfter": null,
    "maxBumpPerDay": null
  }
}
```

## Options

### `versionSource`

Where the version number lives. Options:

| Value | Description |
|-------|-------------|
| `"package.json"` | Read/write version from `package.json` (default) |
| `"git-tag"` | Read from latest semver git tag, write as annotated tag |

### `plugins`

Array of plugins to use. Each entry is either:
- A string (plugin name, no options): `"bumpcraft-plugin-changelog-md"`
- A tuple (plugin name + options): `["bumpcraft-plugin-github", { "repo": "owner/repo" }]`

```json
{
  "plugins": [
    "bumpcraft-plugin-conventional-commits",
    ["bumpcraft-plugin-github", { "repo": "myorg/myrepo" }],
    "./my-custom-plugin.js"
  ]
}
```

**Built-in plugins:**

| Plugin | Stage | Description |
|--------|-------|-------------|
| `bumpcraft-plugin-conventional-commits` | parse | Parses Conventional Commits format |
| `bumpcraft-plugin-changelog-md` | changelog | Generates Markdown changelog |
| `bumpcraft-plugin-changelog-json` | changelog | Generates JSON changelog |
| `bumpcraft-plugin-github` | release | Creates GitHub releases |

### `branches`

Controls which branches can produce releases.

```json
{
  "branches": {
    "release": ["main", "master"],
    "preRelease": {
      "develop": "beta",
      "next": "rc"
    }
  }
}
```

- **`release`** — branches that produce stable releases (`1.2.0`)
- **`preRelease`** — branches that auto-produce pre-releases. Key = branch name, value = pre-release tag. Running `bumpcraft release` on `develop` automatically produces `1.2.0-beta.1`.

The `--pre-release` CLI flag overrides branch-based detection.

### `commitTypes`

Maps commit type prefixes to bump types.

```json
{
  "commitTypes": {
    "feat": "minor",
    "fix": "patch",
    "perf": "patch",
    "hotfix": "patch",
    "refactor": "none"
  }
}
```

Values: `"major"`, `"minor"`, `"patch"`, `"none"`

Note: `BREAKING CHANGE` in a commit footer always produces a major bump regardless of the commit type.

### `policies`

Release policy rules. See [Release Policies](release-policies.md) for details.

```json
{
  "policies": {
    "requireApproval": ["major"],
    "autoRelease": ["patch"],
    "freezeAfter": "friday 17:00",
    "maxBumpPerDay": 5
  }
}
```

## Config File Location

By default, Bumpcraft looks for `.bumpcraftrc.json` in the current working directory. Override with:

```bash
bumpcraft release --config /path/to/config.json
```

Or programmatically:

```typescript
import { runRelease } from 'bumpcraft'
await runRelease({ configPath: '/path/to/config.json' })
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Required for the GitHub release plugin |
| `GITHUB_REPOSITORY` | Fallback repo identifier (`owner/repo`) for GitHub plugin |
| `BUMPCRAFT_API_KEY` | API key for the REST API (required for POST endpoints) |
| `BUMPCRAFT_AUTH_ALL` | Set to `true` to require API key for all endpoints |
| `PORT` | Port for the REST API server (default: `3000`) |
| `EDITOR` | Editor for interactive changelog editing (default: `notepad` on Windows) |
