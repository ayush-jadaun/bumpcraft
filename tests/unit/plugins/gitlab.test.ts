import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { gitlabPlugin } from '../../../src/plugins/gitlab.js'
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
  changelogOutput: '## 1.1.0\n\n- feature',
  releaseResult: null,
  config: defaultConfig,
  dryRun: false,
  logger: noopLogger,
  ...overrides
})

describe('GitLab Plugin', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.GITLAB_TOKEN
    delete process.env.CI_JOB_TOKEN
    delete process.env.CI_PROJECT_ID
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('skips when GITLAB_TOKEN is not set', async () => {
    const result = await gitlabPlugin.execute(ctx())
    expect(result.releaseResult).toBeNull()
  })

  it('skips when nextVersion is null', async () => {
    process.env.GITLAB_TOKEN = 'test'
    process.env.CI_PROJECT_ID = '123'
    const result = await gitlabPlugin.execute(ctx({ nextVersion: null }))
    expect(result.releaseResult).toBeNull()
  })

  it('skips when no project ID', async () => {
    process.env.GITLAB_TOKEN = 'test'
    const result = await gitlabPlugin.execute(ctx())
    expect(result.releaseResult).toBeNull()
  })
})
