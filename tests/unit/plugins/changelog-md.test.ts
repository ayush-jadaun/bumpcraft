import { describe, it, expect } from 'vitest'
import { changelogMdPlugin } from '../../../src/plugins/changelog-md.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'
import type { PipelineContext } from '../../../src/pipeline/types.js'

describe('changelogMdPlugin', () => {
  it('generates markdown changelog', async () => {
    const ctx: PipelineContext = {
      rawCommits: [],
      parsedCommits: [
        { hash: 'abc1234', type: 'feat', scope: 'auth', subject: 'add OAuth', body: null, breaking: false, raw: '' },
        { hash: 'def5678', type: 'fix', scope: null, subject: 'crash on login', body: null, breaking: false, raw: '' }
      ],
      currentVersion: SemVer.parse('1.0.0'),
      nextVersion: SemVer.parse('1.1.0'),
      bumpType: 'minor',
      changelogOutput: null,
      releaseResult: null,
      config: defaultConfig,
      dryRun: false,
      logger: noopLogger
    }
    const result = await changelogMdPlugin.execute(ctx)
    expect(result.changelogOutput).toContain('1.1.0')
    expect(result.changelogOutput).toContain('**auth:** add OAuth')
    expect(result.changelogOutput).toContain('crash on login')
  })

  it('respects pre-authored changelog', async () => {
    const ctx: PipelineContext = {
      rawCommits: [],
      parsedCommits: [],
      currentVersion: SemVer.parse('1.0.0'),
      nextVersion: SemVer.parse('1.1.0'),
      bumpType: 'minor',
      changelogOutput: 'custom changelog',
      releaseResult: null,
      config: defaultConfig,
      dryRun: false,
      logger: noopLogger
    }
    const result = await changelogMdPlugin.execute(ctx)
    expect(result.changelogOutput).toBe('custom changelog')
  })
})
