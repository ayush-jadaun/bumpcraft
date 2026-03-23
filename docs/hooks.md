# Lifecycle Hooks

Run custom commands at key points during the release process.

## Configuration

Add `hooks` to `.bumpcraftrc.json`:

```json
{
  "hooks": {
    "beforeRelease": "npm test",
    "afterRelease": "echo Released $BUMPCRAFT_VERSION",
    "beforeBump": "npm run build",
    "afterBump": "node scripts/post-bump.js"
  }
}
```

## Available Hooks

| Hook | When it runs |
|------|-------------|
| `beforeRelease` | Before any writes (version, changelog, history) |
| `beforeBump` | Before the version is written to package.json |
| `afterBump` | After the version is written to package.json |
| `afterRelease` | After all release artifacts are written |
| `beforePublish` | Before `bumpcraft publish` runs npm publish |
| `afterPublish` | After `bumpcraft publish` completes |

## Environment Variables

All hooks receive these environment variables:

| Variable | Value |
|----------|-------|
| `BUMPCRAFT_VERSION` | The new version (e.g. `1.2.0`) |
| `BUMPCRAFT_PREV_VERSION` | The previous version (e.g. `1.1.0`) |
| `BUMPCRAFT_BUMP_TYPE` | The bump type (`major`, `minor`, or `patch`) |

## Examples

### Run tests before releasing

```json
{ "hooks": { "beforeRelease": "npm test" } }
```

### Build before publishing

```json
{ "hooks": { "beforeBump": "npm run build" } }
```

### Notify Slack after release

```json
{ "hooks": { "afterRelease": "curl -X POST $SLACK_WEBHOOK -d '{\"text\": \"Released v$BUMPCRAFT_VERSION\"}'" } }
```

### Update a lock file after bump

```json
{ "hooks": { "afterBump": "npm install --package-lock-only" } }
```

## Behavior

- Hooks only run on **non-dry-run** releases
- If a hook command fails (non-zero exit), the release **aborts** with an error
- Hooks run in the project root directory
- All `process.env` variables are available in addition to the bumpcraft-specific ones
