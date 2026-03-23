# Version PR Mode

Instead of pushing release commits directly to main, `--create-pr` creates a "Version Packages" pull request for human review before merging.

## Usage

```bash
bumpcraft release --create-pr
```

This:
1. Runs the release pipeline (bumps version, generates changelog)
2. Creates a branch: `bumpcraft/release-v1.2.0`
3. Commits release artifacts (package.json, CHANGELOG.md, .bumpcraft/)
4. Pushes the branch to origin
5. Opens a GitHub PR with the changelog as the body
6. Switches back to your original branch

## Requirements

- `GITHUB_TOKEN` env var (auto-provided in GitHub Actions)
- `GITHUB_REPOSITORY` env var (auto-provided in GitHub Actions)

## CI Integration

```yaml
- name: Create Release PR
  run: npx bumpcraft release --approve --create-pr
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```

## PR Format

The PR title is `chore(release): v1.2.0` and the body includes:

- Version and bump type
- Full changelog
- A note that it was created by bumpcraft

## Workflow

1. Developers push code to `main`
2. CI runs `bumpcraft release --create-pr`
3. Bumpcraft opens a "Version Packages" PR if there are releasable changes
4. Team reviews the version bump and changelog
5. Merge the PR → triggers another CI run → `bumpcraft release --push` publishes

### Recommended CI setup

```yaml
# On push to main: create a release PR (don't release directly)
release-pr:
  if: "!contains(github.event.head_commit.message, 'chore(release)')"
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - run: npm ci && npm run build
    - run: npx bumpcraft release --approve --create-pr
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        GITHUB_REPOSITORY: ${{ github.repository }}

# When the release PR is merged: actually publish
publish:
  if: contains(github.event.head_commit.message, 'chore(release)')
  steps:
    - uses: actions/checkout@v4
    - run: npm ci && npm run build
    - run: npx bumpcraft publish --provenance
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## vs `--push`

| Flag | Behavior |
|------|----------|
| `--push` | Commits + tags + pushes directly to main. Fast, no review. |
| `--create-pr` | Creates a PR for review. Safer for teams. |

Use `--push` for solo projects or trusted CI. Use `--create-pr` for teams that want review before releasing.
