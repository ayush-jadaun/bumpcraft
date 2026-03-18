# Plugin Development

Bumpcraft's pipeline is fully pluggable. Every stage — parsing, resolving, changelog generation, releasing, and notification — can be extended or replaced with custom plugins.

## Plugin Interface

```typescript
interface BumpcraftPlugin {
  name: string
  stage: 'parse' | 'resolve' | 'changelog' | 'release' | 'notify'
  execute(context: PipelineContext): Promise<PipelineContext>
}
```

A plugin declares which pipeline stage it belongs to and implements an `execute` function that receives the pipeline context and returns a (potentially modified) context.

## Pipeline Stages

The pipeline runs stages in this order:

```
parse → resolve → changelog → release → notify
```

| Stage | Purpose | Input | Output |
|-------|---------|-------|--------|
| `parse` | Read git commits, transform into structured objects | `rawCommits` | `parsedCommits`, `bumpType` |
| `resolve` | Determine the bump type from parsed commits | `parsedCommits` | `bumpType`, `nextVersion` |
| `changelog` | Generate changelog output | `parsedCommits`, `nextVersion` | `changelogOutput` |
| `release` | Tag, push, create release on git host | `nextVersion`, `changelogOutput` | `releaseResult` |
| `notify` | Post-release hooks (Slack, email, etc.) | `releaseResult` | — |

**Stage behavior:**
- Multiple plugins per stage run sequentially in registration order
- If `bumpType` is `'none'` after resolve, changelog/release/notify are skipped
- In `dryRun` mode, release and notify stages are skipped

## Pipeline Context

The shared state object passed through all stages:

```typescript
interface PipelineContext {
  rawCommits: string[]                    // raw commit messages from git
  parsedCommits: ParsedCommit[]           // populated by parse stage
  currentVersion: SemVer                  // read from version source
  nextVersion: SemVer | null              // set by resolve stage
  bumpType: 'major' | 'minor' | 'patch' | 'none'
  changelogOutput: string | null          // set by changelog stage
  releaseResult: { url?: string; id?: string } | null
  config: BumpcraftConfig                 // resolved configuration
  dryRun: boolean
  logger: Logger                          // use this for logging
}
```

## Writing a Plugin

### Example: Slack Notifier Plugin

```typescript
// bumpcraft-plugin-slack.ts
import type { BumpcraftPlugin, PipelineContext } from 'bumpcraft'

export const slackPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-slack',
  stage: 'notify',

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const opts = context.config.pluginOptions['bumpcraft-plugin-slack'] as
      { webhookUrl?: string } | undefined

    if (!opts?.webhookUrl) {
      context.logger.warn('Slack webhook URL not configured — skipping')
      return context
    }

    const message = `Released v${context.nextVersion?.toString()} :rocket:\n${context.changelogOutput ?? ''}`

    await fetch(opts.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    })

    context.logger.info('Slack notification sent')
    return context
  }
}
```

### Example: Custom Commit Parser (Emoji-based)

```typescript
// bumpcraft-plugin-emoji-parser.ts
import type { BumpcraftPlugin, ParsedCommit, PipelineContext } from 'bumpcraft'

const EMOJI_MAP: Record<string, string> = {
  '✨': 'feat',
  '🐛': 'fix',
  '💥': 'breaking',
  '📝': 'docs',
  '♻️': 'refactor'
}

export const emojiParserPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-emoji-parser',
  stage: 'parse',

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const parsedCommits: ParsedCommit[] = context.rawCommits.map(raw => {
      const [hashAndMsg] = raw.split('\n')
      const hash = hashAndMsg.slice(0, 7)
      const msg = hashAndMsg.slice(8)

      let type = 'chore'
      let breaking = false
      for (const [emoji, commitType] of Object.entries(EMOJI_MAP)) {
        if (msg.includes(emoji)) {
          if (commitType === 'breaking') { breaking = true; type = 'feat' }
          else type = commitType
          break
        }
      }

      return { hash, type, scope: null, subject: msg, body: null, breaking, raw }
    })

    return { ...context, parsedCommits }
  }
}
```

## Using Your Plugin

### As a local file

```json
{
  "plugins": [
    "bumpcraft-plugin-conventional-commits",
    ["./my-plugins/slack.js", { "webhookUrl": "https://hooks.slack.com/..." }]
  ]
}
```

### As an npm package

Name your package `bumpcraft-plugin-<name>` and publish it:

```json
{
  "plugins": [
    "bumpcraft-plugin-conventional-commits",
    ["bumpcraft-plugin-slack", { "webhookUrl": "https://..." }]
  ]
}
```

## Accessing Plugin Options

Plugin-specific config is passed via the tuple syntax in `.bumpcraftrc.json` and accessible on the context:

```typescript
const opts = context.config.pluginOptions['my-plugin-name']
```

## Guidelines

- **Don't mutate the context directly.** Return a new object with spread: `return { ...context, changelogOutput }`
- **Use `context.logger`** for logging, not `console.log`
- **Check for pre-existing values.** If `context.changelogOutput` is already set (e.g., from interactive edit mode), respect it:
  ```typescript
  if (context.changelogOutput) return context
  ```
- **Handle missing config gracefully.** Warn and skip rather than throwing if a required option is missing.
- **Keep plugins focused.** One plugin, one stage, one responsibility.

## Built-in Plugins

| Plugin | Stage | Source |
|--------|-------|--------|
| `bumpcraft-plugin-conventional-commits` | parse | `src/plugins/conventional-commits.ts` |
| `bumpcraft-plugin-changelog-md` | changelog | `src/plugins/changelog-md.ts` |
| `bumpcraft-plugin-changelog-json` | changelog | `src/plugins/changelog-json.ts` |
| `bumpcraft-plugin-github` | release | `src/plugins/github.ts` |

Read these for reference implementations.
