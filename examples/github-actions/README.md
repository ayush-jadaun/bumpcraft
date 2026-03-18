# GitHub Actions Example

Automatically release on every push to `main`.

## Setup

1. Copy `release.yml` to `.github/workflows/release.yml` in your repo
2. Run `npx bumpcraft init` in your project root
3. Start using conventional commits:
   ```
   git commit -m "feat: add user profiles"
   git commit -m "fix: login crash on empty password"
   ```
4. Push to main — Bumpcraft handles the rest

## What it does

On every push to `main`:
1. Checks if there are releasable commits since the last tag
2. If yes: bumps version, generates changelog, creates GitHub release
3. If no: exits cleanly, no release

## Customization

Edit `.bumpcraftrc.json` to:
- Change which commit types trigger bumps
- Add release policies (e.g., freeze weekends)
- Require approval for major bumps
- Use pre-release tags for feature branches

## With npm publish

Add this step after the release:

```yaml
- name: Publish to npm
  if: steps.check.outputs.release == 'true'
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: npm publish
```
