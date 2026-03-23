import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { bitbucketPlugin } from '../../../src/plugins/bitbucket.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'
import type { PipelineContext } from '../../../src/pipeline/types.js'

const ctx = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
  rawCommits: [],
  parsedCommits: [],
  currentVersion: SemVer.parse('1.0.0'),
  nextVersion: SemVer.parse('1.1.0'),
  bumpType: 'minor',
  changelogOutput: '## 1.1.0',
  releaseResult: null,
  config: defaultConfig,
  dryRun: false,
  logger: noopLogger,
  ...overrides
})

describe('Bitbucket Plugin', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.BITBUCKET_USER
    delete process.env.BITBUCKET_APP_PASSWORD
    delete process.env.BITBUCKET_REPO_FULL_NAME
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('skips when credentials not set', async () => {
    const result = await bitbucketPlugin.execute(ctx())
    expect(result.releaseResult).toBeNull()
  })

  it('skips when only user is set (no password)', async () => {
    process.env.BITBUCKET_USER = 'user'
    const result = await bitbucketPlugin.execute(ctx())
    expect(result.releaseResult).toBeNull()
  })

  it('skips when nextVersion is null', async () => {
    process.env.BITBUCKET_USER = 'user'
    process.env.BITBUCKET_APP_PASSWORD = 'pass'
    process.env.BITBUCKET_REPO_FULL_NAME = 'org/repo'
    const result = await bitbucketPlugin.execute(ctx({ nextVersion: null }))
    expect(result.releaseResult).toBeNull()
  })

  it('skips when no repo configured', async () => {
    process.env.BITBUCKET_USER = 'user'
    process.env.BITBUCKET_APP_PASSWORD = 'pass'
    const result = await bitbucketPlugin.execute(ctx())
    expect(result.releaseResult).toBeNull()
  })
})
