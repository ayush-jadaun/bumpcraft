# Programmatic Usage Examples

Use Bumpcraft as a library in your own Node.js/TypeScript scripts.

## Files

| File | Description |
|------|-------------|
| `release-script.ts` | Full release with custom pre/post hooks (Slack, deploy, etc.) |
| `pre-release-workflow.ts` | Beta/RC pre-release workflow for staging environments |

## Install

```bash
npm install bumpcraft
```

## Run

```bash
npx tsx examples/programmatic/release-script.ts
```

## Key APIs

```typescript
import { runRelease, currentVersion } from 'bumpcraft'

// Get current version
const version = await currentVersion()

// Dry-run preview
const preview = await runRelease({ dryRun: true })

// Full release with options
const result = await runRelease({
  preRelease: 'beta',        // create pre-release
  forceBump: 'minor',        // override auto-detection
  overrideChangelog: '...',  // custom changelog text
})
```
