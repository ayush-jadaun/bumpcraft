import { describe, it, expect, vi } from 'vitest'
import { PipelineRunner } from '../../../src/pipeline/runner.js'
import type { BumpcraftPlugin, PipelineContext } from '../../../src/pipeline/types.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'

const makeContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
  rawCommits: [],
  parsedCommits: [],
  currentVersion: SemVer.parse('1.0.0'),
  nextVersion: null,
  bumpType: 'none',
  changelogOutput: null,
  releaseResult: null,
  config: defaultConfig,
  dryRun: false,
  logger: noopLogger,
  ...overrides
})

const makePlugin = (
  stage: BumpcraftPlugin['stage'],
  fn: (ctx: PipelineContext) => PipelineContext
): BumpcraftPlugin => ({
  name: `test-${stage}`,
  stage,
  execute: async (ctx) => fn(ctx)
})

describe('PipelineRunner', () => {
  it('runs plugins in stage order', async () => {
    const order: string[] = []
    const runner = new PipelineRunner([
      makePlugin('changelog', ctx => { order.push('changelog'); return ctx }),
      makePlugin('parse', ctx => { order.push('parse'); return ctx }),
      makePlugin('resolve', ctx => { order.push('resolve'); return { ...ctx, bumpType: 'patch' } }),
    ])
    await runner.run(makeContext())
    expect(order).toEqual(['parse', 'resolve', 'changelog'])
  })

  it('exits early when bumpType is none', async () => {
    const changelogSpy = vi.fn(async (ctx: PipelineContext) => ctx)
    const runner = new PipelineRunner([
      makePlugin('resolve', ctx => ({ ...ctx, bumpType: 'none' })),
      { name: 'changelog', stage: 'changelog', execute: changelogSpy }
    ])
    await runner.run(makeContext())
    expect(changelogSpy).not.toHaveBeenCalled()
  })

  it('skips release and notify in dryRun mode', async () => {
    const releaseSpy = vi.fn(async (ctx: PipelineContext) => ctx)
    const runner = new PipelineRunner([
      makePlugin('resolve', ctx => ({ ...ctx, bumpType: 'patch' })),
      { name: 'release', stage: 'release', execute: releaseSpy }
    ])
    await runner.run(makeContext({ dryRun: true }))
    expect(releaseSpy).not.toHaveBeenCalled()
  })

  it('wraps plugin errors with PLUGIN_FAILED code', async () => {
    const runner = new PipelineRunner([
      makePlugin('parse', () => { throw new Error('boom') })
    ])
    await expect(runner.run(makeContext())).rejects.toMatchObject({
      code: 'PLUGIN_FAILED',
    })
  })
})
