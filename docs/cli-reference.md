# CLI Reference

## Global Options

```
bumpcraft --version    Show version number
bumpcraft --help       Show help
```

---

## Commands

### `bumpcraft release`

Run the full release pipeline: parse commits, determine bump, generate changelog, tag, and release.

```bash
bumpcraft release [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview all changes without writing anything |
| `-i, --interactive` | Show preview and ask for confirmation before releasing |
| `--approve` | Override a policy-blocked release (e.g., when `requireApproval` blocks major bumps) |
| `--pre-release <tag>` | Create a pre-release version (e.g., `--pre-release alpha` produces `1.2.0-alpha.1`) |
| `--force-bump <type>` | Override auto-detection. Force `major`, `minor`, or `patch` bump |
| `--from <ref>` | Analyze commits from a specific git ref instead of the latest tag |
| `-v, --verbose` | Show debug-level output |
| `--push` | Commit, tag, push, create GitHub release, and skip CI on the release commit (see below) |

### `--push` in detail

When `--push` is used, bumpcraft handles the full release lifecycle:

1. Bumps version in `package.json`
2. Generates `CHANGELOG.md`
3. Records release in `.bumpcraft/history.json`
4. Commits all release artifacts with `[skip ci]` in the message (prevents CI from re-running on the release commit)
5. Creates an annotated git tag (`v1.2.0`)
6. Pushes the commit and tag to remote
7. **Creates a GitHub Release** with the changelog as the body (if `GITHUB_TOKEN` is available)

**GitHub Release creation is automatic** — if `GITHUB_TOKEN` and `GITHUB_REPOSITORY` environment variables are set, bumpcraft creates a GitHub Release with full release notes. In GitHub Actions, both are provided automatically. No manual secret setup needed.

If you also have `bumpcraft-plugin-github` in your config, the plugin creates the release during the pipeline (step 3 above). The `--push` fallback only fires if the plugin didn't run.

**Examples:**

```bash
# Standard release
bumpcraft release

# Preview only
bumpcraft release --dry-run

# Interactive mode — review changelog, optionally edit before releasing
bumpcraft release -i

# Force a major bump regardless of commit types
bumpcraft release --force-bump major

# Create a beta pre-release
bumpcraft release --pre-release beta

# Release with verbose logging
bumpcraft release -v

# Full CI release — commit, tag, push, and create GitHub release
bumpcraft release --approve --push

# Override a policy block
bumpcraft release --approve
```

**Exit codes:**
- `0` — release succeeded
- `1` — error occurred
- `2` — no release needed (no relevant commits since last tag)

---

### `bumpcraft version`

Show the current version (read from `package.json` or git tags, depending on config).

```bash
bumpcraft version
# Output: 1.2.3
```

---

### `bumpcraft changelog`

Generate a changelog preview without bumping or releasing.

```bash
bumpcraft changelog [options]
```

| Flag | Description |
|------|-------------|
| `--from <ref>` | Analyze commits from a specific git ref |

```bash
bumpcraft changelog
bumpcraft changelog --from v1.0.0
```

---

### `bumpcraft validate`

Alias for `bumpcraft release --dry-run`. Shows what a release would do without making changes.

```bash
bumpcraft validate
# Output: Would release: 1.3.0 (minor)
# ## 1.3.0 (2026-03-18)
# ### Features
# - add dark mode (abc1234)
```

---

### `bumpcraft init`

Create a `.bumpcraftrc.json` config file with defaults. Won't overwrite if one already exists.

```bash
bumpcraft init
# Output: Created .bumpcraftrc.json
```

---

### `bumpcraft plugins list`

Show all configured plugins.

```bash
bumpcraft plugins list
# Output:
#  - bumpcraft-plugin-conventional-commits
#  - bumpcraft-plugin-changelog-md
```

---

### `bumpcraft group`

Manage release groups — batch commits into named releases.

```bash
# Create a new group
bumpcraft group create "v3-launch"

# Add current pending commits to the group
bumpcraft group add "v3-launch"

# Show group status
bumpcraft group status "v3-launch"

# List all groups
bumpcraft group list

# Release everything in the group
bumpcraft group release "v3-launch"
```

See [Release Groups](release-groups.md) for details.

---

### `bumpcraft history`

Query the release history database.

```bash
bumpcraft history [options]
```

| Flag | Description |
|------|-------------|
| `--breaking` | Show only releases with breaking changes |
| `--scope <scope>` | Filter by commit scope (e.g., `auth`, `api`) |
| `--type <type>` | Filter by commit type (e.g., `feat`, `fix`) |
| `--since <version>` | Show releases since a version |
| `--from <version>` | Range start (use with `--to`) |
| `--to <version>` | Range end (use with `--from`) |
| `--last <n>` | Show only the last N releases |

**Examples:**

```bash
# All breaking changes
bumpcraft history --breaking

# All auth-related changes since v2.0.0
bumpcraft history --scope auth --since v2.0.0

# Last 5 releases
bumpcraft history --last 5

# Changes between two versions
bumpcraft history --from v1.0.0 --to v2.0.0
```

See [History & Querying](history.md) for details.

---

### `bumpcraft status`

Show pending changes and what would be released.

```bash
bumpcraft status
```

In monorepo mode, shows per-package commit counts and predicted bump types. In single-package mode, shows the overall release preview.

---

### `bumpcraft publish`

Publish packages to npm.

```bash
bumpcraft publish [options]
```

| Flag | Description |
|------|-------------|
| `--package <name>` | Publish a specific monorepo package |
| `--provenance` | Generate npm provenance attestation (CI only) |
| `--tag <tag>` | npm dist-tag (e.g. `latest`, `next`, `beta`) |
| `--dry-run` | Preview without publishing |
| `--otp <code>` | One-time password for npm 2FA |

Scoped packages (`@org/name`) are published with `--access public` automatically.
Private packages (`"private": true`) are automatically skipped.

See [Publishing](publishing.md) for details.

---

### `bumpcraft init-release`

Tag the current commit as a baseline release (for adopting bumpcraft in existing projects).

```bash
bumpcraft init-release --tag-version 1.0.0 [options]
```

| Flag | Description |
|------|-------------|
| `--tag-version <version>` | Version to tag (required) |
| `--message <msg>` | Tag message (default: "Initial release") |
| `--force` | Overwrite existing tag |
| `--allow-dirty` | Allow tagging with uncommitted changes |
| `--push` | Push the commit and tag to remote |
