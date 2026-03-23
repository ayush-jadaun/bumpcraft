import { describe, it, expect } from 'vitest'
import { changelogMdPlugin } from '../../../src/plugins/changelog-md.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'
import type { PipelineContext } from '../../../src/pipeline/types.js'

describe('Custom changelog template', () => {
  it('uses template when configured', async () => {
    const ctx: PipelineContext = {
      rawCommits: [],
      parsedCommits: [
        { hash: 'abc1234', type: 'feat', scope: 'auth', subject: 'add OAuth', body: null, breaking: false, raw: '' },
        { hash: 'def5678', type: 'fix', scope: null, subject: 'crash fix', body: null, breaking: false, raw: '' }
      ],
      currentVersion: SemVer.parse('1.0.0'),
      nextVersion: SemVer.parse('1.1.0'),
      bumpType: 'minor',
      changelogOutput: null,
      releaseResult: null,
      config: { ...defaultConfig, changelogTemplate: '# Release {version}\nDate: {date}\nPrev: {previousVersion}\n\n{commits}\n' },
      dryRun: false,
      logger: noopLogger
    }
    const result = await changelogMdPlugin.execute(ctx)
    expect(result.changelogOutput).toContain('# Release 1.1.0')
    expect(result.changelogOutput).toContain('Prev: 1.0.0')
    expect(result.changelogOutput).toContain('**auth:** add OAuth')
    expect(result.changelogOutput).toContain('crash fix')
  })

  it('marks breaking commits in template output', async () => {
    const ctx: PipelineContext = {
      rawCommits: [],
      parsedCommits: [
        { hash: 'abc1234', type: 'feat', scope: null, subject: 'big change', body: null, breaking: true, raw: '' }
      ],
      currentVersion: SemVer.parse('1.0.0'),
      nextVersion: SemVer.parse('2.0.0'),
      bumpType: 'major',
      changelogOutput: null,
      releaseResult: null,
      config: { ...defaultConfig, changelogTemplate: '{version}\n{commits}' },
      dryRun: false,
      logger: noopLogger
    }
    const result = await changelogMdPlugin.execute(ctx)
    expect(result.changelogOutput).toContain('BREAKING')
  })

  it('falls back to default format when no template set', async () => {
    const ctx: PipelineContext = {
      rawCommits: [],
      parsedCommits: [
        { hash: 'abc1234', type: 'feat', scope: null, subject: 'thing', body: null, breaking: false, raw: '' }
      ],
      currentVersion: SemVer.parse('1.0.0'),
      nextVersion: SemVer.parse('1.1.0'),
      bumpType: 'minor',
      changelogOutput: null,
      releaseResult: null,
      config: defaultConfig, // changelogTemplate is null by default
      dryRun: false,
      logger: noopLogger
    }
    const result = await changelogMdPlugin.execute(ctx)
    // Default format uses emoji section headers
    expect(result.changelogOutput).toContain('🚀 Features')
  })
})
