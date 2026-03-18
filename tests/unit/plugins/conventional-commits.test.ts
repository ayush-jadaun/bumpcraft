import { describe, it, expect } from 'vitest'
import { conventionalCommitsPlugin } from '../../../src/plugins/conventional-commits.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'
import type { PipelineContext } from '../../../src/pipeline/types.js'

const ctx = (rawCommits: string[]): PipelineContext => ({
  rawCommits,
  parsedCommits: [],
  currentVersion: SemVer.parse('1.0.0'),
  nextVersion: null,
  bumpType: 'none',
  changelogOutput: null,
  releaseResult: null,
  config: defaultConfig,
  dryRun: false,
  logger: noopLogger
})

describe('conventionalCommitsPlugin', () => {
  it('parses feat commit', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: add dark mode']))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'feat', subject: 'add dark mode', breaking: false })
  })

  it('parses scoped commit', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 fix(auth): token expiry']))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'fix', scope: 'auth', subject: 'token expiry' })
  })

  it('detects BREAKING CHANGE in body', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat: new API\n\nBREAKING CHANGE: old endpoint removed'])
    )
    expect(result.parsedCommits[0].breaking).toBe(true)
  })

  it('sets bumpType to minor for feat', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: something']))
    expect(result.bumpType).toBe('minor')
  })

  it('sets bumpType to major for breaking', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat!: breaking\n\nBREAKING CHANGE: yes'])
    )
    expect(result.bumpType).toBe('major')
  })
})
