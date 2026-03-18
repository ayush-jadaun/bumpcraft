# Library API

Use Bumpcraft programmatically by importing it as a Node.js module.

## Installation

```bash
npm install bumpcraft
```

## Exports

```typescript
import {
  runRelease,
  runReleaseWithCommits,
  currentVersion,
  SemVer,
  BumpcraftError,
  ErrorCode
} from 'bumpcraft'

// Type-only exports
import type {
  BumpcraftPlugin,
  PipelineContext,
  ParsedCommit,
  BumpType,
  BumpcraftConfig
} from 'bumpcraft'
```

---

## `runRelease(options?)`

Run the full release pipeline.

```typescript
const result = await runRelease({
  dryRun: true,               // preview without writing (default: false)
  preRelease: 'beta',         // create pre-release (optional)
  forceBump: 'major',         // override auto-detection (optional)
  from: 'v1.0.0',             // analyze from this ref (optional, default: latest tag)
  configPath: '.bumpcraftrc.json',  // config file path (optional)
  verbose: true,              // enable debug logging (optional)
  overrideChangelog: '...',   // inject custom changelog text (optional)
})
```

**Returns:**

```typescript
{
  bumpType: 'minor',              // 'major' | 'minor' | 'patch' | 'none'
  currentVersion: '1.2.0',       // version before bump
  nextVersion: '1.3.0',          // version after bump (null if bumpType is 'none')
  changelogOutput: '## 1.3.0...', // generated changelog (null if none)
  releaseResult: { url: '...' }, // from release plugin (null if none)
  dryRun: true
}
```

**Example — CI/CD integration:**

```typescript
import { runRelease } from 'bumpcraft'

const result = await runRelease()

if (result.bumpType === 'none') {
  console.log('No release needed')
  process.exit(0)
}

console.log(`Released ${result.nextVersion}`)
if (result.releaseResult?.url) {
  console.log(`GitHub: ${result.releaseResult.url}`)
}
```

---

## `runReleaseWithCommits(commits, options?)`

Run the pipeline with an explicit set of raw commits instead of reading from git. Used by release groups.

```typescript
const commits = [
  'abc1234 feat: add dark mode',
  'def5678 fix: crash on login'
]

const result = await runReleaseWithCommits(commits, { dryRun: true })
```

---

## `currentVersion(configPath?)`

Get the current version as a string.

```typescript
const version = await currentVersion()
console.log(version) // '1.2.3'
```

---

## `SemVer`

Immutable semantic version value object.

```typescript
import { SemVer } from 'bumpcraft'

// Parse
const v = SemVer.parse('1.2.3-beta.1')
console.log(v.major, v.minor, v.patch) // 1, 2, 3
console.log(v.preRelease)              // 'beta.1'
console.log(v.toString())             // '1.2.3-beta.1'

// Compare
SemVer.parse('2.0.0').gt(SemVer.parse('1.9.9'))  // true
SemVer.parse('1.0.0').lt(SemVer.parse('1.0.1'))  // true
SemVer.parse('1.2.3').eq(SemVer.parse('1.2.3'))  // true

// Bump (returns new SemVer, original is unchanged)
SemVer.parse('1.2.3').bumpMajor()    // 2.0.0
SemVer.parse('1.2.3').bumpMinor()    // 1.3.0
SemVer.parse('1.2.3').bumpPatch()    // 1.2.4

// Pre-release bump
SemVer.parse('1.3.0').bumpPreRelease('beta')     // 1.3.0-beta.1
SemVer.parse('1.3.0-beta.1').bumpPreRelease('beta') // 1.3.0-beta.2
```

---

## `BumpcraftError`

Custom error class with error codes.

```typescript
import { BumpcraftError, ErrorCode } from 'bumpcraft'

try {
  await runRelease()
} catch (err) {
  if (err instanceof BumpcraftError) {
    console.log(err.code)     // 'NO_COMMITS', 'INVALID_VERSION', etc.
    console.log(err.message)  // human-readable message
    console.log(err.context)  // optional context object
  }
}
```

**Error codes:**

| Code | When |
|------|------|
| `NO_COMMITS` | No commits found since last release |
| `INVALID_VERSION` | Version string doesn't parse as semver |
| `PLUGIN_FAILED` | A plugin threw during execution |
| `GIT_ERROR` | Git operation failed |
| `CONFIG_ERROR` | Invalid configuration |
| `POLICY_BLOCKED` | Release blocked by policy |
