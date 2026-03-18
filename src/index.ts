import { loadConfig } from './core/config.js'
import { createVersionSource } from './core/version-source.js'
import { GitClient } from './core/git-client.js'
import { PipelineRunner } from './pipeline/runner.js'
import { HistoryStore } from './history/history-store.js'
import { ConsoleLogger } from './core/logger.js'
import { BumpcraftError, ErrorCode } from './core/errors.js'
import { conventionalCommitsPlugin } from './plugins/conventional-commits.js'
import { changelogMdPlugin } from './plugins/changelog-md.js'
import { changelogJsonPlugin } from './plugins/changelog-json.js'
import { githubPlugin } from './plugins/github.js'
import type { PipelineContext, BumpType } from './pipeline/types.js'
import { join } from 'path'

export { SemVer } from './core/semver.js'
export { BumpcraftError, ErrorCode } from './core/errors.js'
export type { BumpcraftPlugin, PipelineContext, ParsedCommit, BumpType } from './pipeline/types.js'
export type { BumpcraftConfig } from './core/config.js'

const BUILT_IN_PLUGINS = {
  'bumpcraft-plugin-conventional-commits': conventionalCommitsPlugin,
  'bumpcraft-plugin-changelog-md': changelogMdPlugin,
  'bumpcraft-plugin-changelog-json': changelogJsonPlugin,
  'bumpcraft-plugin-github': githubPlugin,
} as const

export interface ReleaseOptions {
  configPath?: string
  dryRun?: boolean
  preRelease?: string
  forceBump?: string
  from?: string
  verbose?: boolean
  overrideChangelog?: string
  _rawCommitsOverride?: string[]
}

export async function runRelease(options: ReleaseOptions = {}) {
  const config = await loadConfig(options.configPath ?? '.bumpcraftrc.json')
  const logger = new ConsoleLogger(options.verbose)
  const git = new GitClient()
  const versionSource = createVersionSource(config.versionSource)
  const currentVersion = await versionSource.read()

  const latestTag = await git.getLatestTag()
  const ref = options.from ?? latestTag
  const rawCommits = options._rawCommitsOverride ?? await git.getCommitsSince(ref)

  if (!rawCommits.length) {
    return { bumpType: 'none' as BumpType, currentVersion: currentVersion.toString(), nextVersion: null, changelogOutput: null, releaseResult: null, dryRun: options.dryRun ?? false }
  }

  const plugins = config.plugins.map(p => {
    const name = Array.isArray(p) ? p[0] : p
    return BUILT_IN_PLUGINS[name as keyof typeof BUILT_IN_PLUGINS]
  }).filter(Boolean)

  let ctx: PipelineContext = {
    rawCommits,
    parsedCommits: [],
    currentVersion,
    nextVersion: null,
    bumpType: 'none',
    changelogOutput: options.overrideChangelog ?? null,
    releaseResult: null,
    config,
    dryRun: options.dryRun ?? false,
    logger
  }

  // Synthetic resolve plugin that computes nextVersion after bumpType is determined
  const nextVersionPlugin = {
    name: 'bumpcraft-internal-next-version',
    stage: 'resolve' as const,
    async execute(c: PipelineContext): Promise<PipelineContext> {
      if (c.bumpType === 'none') return c
      let next = currentVersion
      if (options.forceBump) {
        next = options.forceBump === 'major' ? currentVersion.bumpMajor()
          : options.forceBump === 'minor' ? currentVersion.bumpMinor()
          : currentVersion.bumpPatch()
      } else {
        next = c.bumpType === 'major' ? currentVersion.bumpMajor()
          : c.bumpType === 'minor' ? currentVersion.bumpMinor()
          : currentVersion.bumpPatch()
      }
      if (options.preRelease) next = next.bumpPreRelease(options.preRelease)
      return { ...c, nextVersion: next }
    }
  }

  const runner = new PipelineRunner([...plugins, nextVersionPlugin])
  ctx = await runner.run(ctx)

  if (ctx.bumpType === 'none') {
    return { bumpType: 'none' as BumpType, currentVersion: currentVersion.toString(), nextVersion: null, changelogOutput: null, releaseResult: null, dryRun: options.dryRun ?? false }
  }

  if (!ctx.nextVersion) {
    throw new BumpcraftError(ErrorCode.INVALID_VERSION, 'nextVersion was not set by the pipeline')
  }

  if (!options.dryRun) {
    await versionSource.write(ctx.nextVersion)
    const store = new HistoryStore(join('.bumpcraft', 'history.json'))
    await store.save({
      version: ctx.nextVersion.toString(),
      previousVersion: currentVersion.toString(),
      date: new Date().toISOString(),
      commits: ctx.parsedCommits,
      changelogOutput: ctx.changelogOutput ?? ''
    })
  }

  return {
    bumpType: ctx.bumpType as BumpType,
    currentVersion: currentVersion.toString(),
    nextVersion: ctx.nextVersion.toString(),
    changelogOutput: ctx.changelogOutput,
    releaseResult: ctx.releaseResult,
    dryRun: options.dryRun ?? false
  }
}

export async function runReleaseWithCommits(rawCommits: string[], options: ReleaseOptions = {}) {
  return runRelease({ ...options, _rawCommitsOverride: rawCommits })
}

export async function currentVersion(configPath?: string) {
  const config = await loadConfig(configPath ?? '.bumpcraftrc.json')
  const source = createVersionSource(config.versionSource)
  return (await source.read()).toString()
}
