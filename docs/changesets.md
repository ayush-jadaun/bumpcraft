# Changeset Files

Changeset files let you manually declare version bumps alongside your code changes. They work **together** with commit-based detection — the higher bump wins.

## Why Use Changeset Files?

- Decouple the version bump from the commit message
- Multiple contributors can declare their own changes
- Code reviewers can verify the bump type in the PR
- Trigger a release even when commits are `chore:` type

## Creating a Changeset

### Interactive

```bash
bumpcraft changeset create
```

Bumpcraft asks for each package (in monorepo) or bump type (single package) and a summary.

### Non-interactive

```bash
# Single package
bumpcraft changeset create --package root --bump minor --message "Add support for custom templates"

# Monorepo
bumpcraft changeset create --package auth api --bump minor --message "Shared auth improvements"
```

### Manual

Create a file in `.changeset/`:

```markdown
---
"auth": minor
"api": patch
---

Add OAuth support to auth and fix API timeout handling.
```

The filename can be anything (bumpcraft uses random hex IDs).

## How It Works During Release

1. `bumpcraft release` reads all `.changeset/*.md` files
2. Merges with commit-based bump detection — **highest bump wins**
3. Changeset summaries appear in the changelog under "### Changesets"
4. After a successful (non-dry-run) release, changeset files are **deleted**

### Examples

| Commits say | Changesets say | Result |
|-------------|---------------|--------|
| `patch` | `minor` | **minor** |
| `major` | `patch` | **major** |
| `none` | `minor` | **minor** |
| `none` | (none) | **none** |

## Listing Pending Changesets

```bash
bumpcraft changeset list
```

Output:
```
  abc12345 — auth:minor, api:patch — Add OAuth and fix timeout
  def67890 — core:major — Complete rewrite
```

## In CI

Changeset files should be committed to git alongside your code:

```bash
# Developer workflow
bumpcraft changeset create --package auth --bump minor --message "New login flow"
git add .changeset/
git commit -m "chore: add changeset for auth"
git push
```

When CI runs `bumpcraft release`, it picks up the changeset files automatically.

## Monorepo

In monorepo mode, changeset files specify bump types per package:

```markdown
---
"auth": major
"api": minor
---

Redesign auth API, update API client to match.
```

Each package gets its own bump. The highest bump across all changesets and commits wins per package.
