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
import { gitlabPlugin } from './plugins/gitlab.js'
import { bitbucketPlugin } from './plugins/bitbucket.js'
import type { PipelineContext, BumpType } from './pipeline/types.js'
import { join } from 'path'
import { readFile, writeFile, rename } from 'fs/promises'
import { runHook } from './core/hooks.js'
import { readChangesets, consumeChangesets } from './core/changeset-files.js'

export { SemVer } from './core/semver.js'
export { BumpcraftError, ErrorCode } from './core/errors.js'
export type { BumpcraftPlugin, PipelineContext, ParsedCommit, BumpType } from './pipeline/types.js'
export type { BumpcraftConfig } from './core/config.js'

const BUILT_IN_PLUGINS = {
  'bumpcraft-plugin-conventional-commits': conventionalCommitsPlugin,
  'bumpcraft-plugin-changelog-md': changelogMdPlugin,
  'bumpcraft-plugin-changelog-json': changelogJsonPlugin,
  'bumpcraft-plugin-github': githubPlugin,
  'bumpcraft-plugin-gitlab': gitlabPlugin,
  'bumpcraft-plugin-bitbucket': bitbucketPlugin,
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
  package?: string  // monorepo: release a specific package
}

export interface MonorepoReleaseResult {
  package: string
  bumpType: BumpType
  currentVersion: string
  nextVersion: string | null
  changelogOutput: string | null
}

const VALID_BUMPS = ['major', 'minor', 'patch']

export async function runRelease(options: ReleaseOptions = {}) {
  // Normalize forceBump: only accept valid bump types, ignore anything else
  const forceBump = options.forceBump && VALID_BUMPS.includes(options.forceBump)
    ? options.forceBump as BumpType
    : undefined

  const config = await loadConfig(options.configPath ?? '.bumpcraftrc.json')
  const logger = new ConsoleLogger(options.verbose)
  const git = new GitClient()
  const versionSource = createVersionSource(config.versionSource)
  const currentVersion = await versionSource.read()

  // Warn on shallow clones — commit history may be incomplete
  if (await git.isShallowClone()) {
    logger.warn('Shallow clone detected — commit history may be incomplete. Use fetch-depth: 0 in CI.')
  }

  // Warn on dirty working tree for non-dry-run
  if (!options.dryRun && await git.isDirty()) {
    logger.warn('Working tree has uncommitted changes. The release tag will not include them.')
  }

  // Branch strategy
  try {
    const currentBranch = await git.getCurrentBranch()
    const isReleaseBranch = config.branches.release.includes(currentBranch)
    const preReleaseTag = config.branches.preRelease[currentBranch]

    // If on a pre-release branch and no explicit --pre-release flag, use the configured tag
    if (preReleaseTag && !options.preRelease) {
      options = { ...options, preRelease: preReleaseTag }
    }

    // If on an unrecognized branch and no force-bump, return early
    if (!isReleaseBranch && !preReleaseTag && !forceBump) {
      return { bumpType: 'none' as BumpType, currentVersion: currentVersion.toString(), nextVersion: null, changelogOutput: null, releaseResult: null, dryRun: options.dryRun ?? false }
    }
  } catch {
    // Not a git repo or other git error — skip branch strategy
  }

  const latestTag = await git.getLatestTag()
  const ref = options.from ?? latestTag
  const rawCommits = options._rawCommitsOverride ?? await git.getCommitsSince(ref)

  if (!rawCommits.length && !forceBump) {
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
      const effectiveBump = forceBump ?? (c.bumpType === 'none' ? undefined : c.bumpType)
      if (!effectiveBump || effectiveBump === 'none') return c

      let next = currentVersion
      if (effectiveBump === 'major') next = currentVersion.bumpMajor()
      else if (effectiveBump === 'minor') next = currentVersion.bumpMinor()
      else next = currentVersion.bumpPatch()

      if (options.preRelease) next = next.bumpPreRelease(options.preRelease)
      return { ...c, bumpType: effectiveBump as BumpType, nextVersion: next }
    }
  }

  const runner = new PipelineRunner([...plugins, nextVersionPlugin])
  ctx = await runner.run(ctx)

  // Check changeset files — they can upgrade the bump type even when commits produce 'none'
  const changesets = await readChangesets()
  if (changesets.length > 0) {
    const PRIORITY: Record<string, number> = { none: 0, patch: 1, minor: 2, major: 3 }
    let changesetBump: BumpType = 'none'
    const changesetSummaries: string[] = []
    for (const cs of changesets) {
      for (const bump of Object.values(cs.packages)) {
        if ((PRIORITY[bump] ?? 0) > (PRIORITY[changesetBump] ?? 0)) {
          changesetBump = bump as BumpType
        }
      }
      changesetSummaries.push(cs.summary)
    }

    if ((PRIORITY[changesetBump] ?? 0) > (PRIORITY[ctx.bumpType] ?? 0)) {
      // Changeset files request a higher bump than commits
      let next = currentVersion
      if (changesetBump === 'major') next = currentVersion.bumpMajor()
      else if (changesetBump === 'minor') next = currentVersion.bumpMinor()
      else next = currentVersion.bumpPatch()
      if (options.preRelease) next = next.bumpPreRelease(options.preRelease)
      ctx = { ...ctx, bumpType: changesetBump, nextVersion: next }
    }

    // Append changeset summaries to changelog
    if (changesetSummaries.length > 0 && ctx.changelogOutput) {
      ctx = { ...ctx, changelogOutput: ctx.changelogOutput + '\n### Changesets\n\n' + changesetSummaries.map(s => `- ${s}`).join('\n') + '\n' }
    }
  }

  if (ctx.bumpType === 'none' && !forceBump) {
    return { bumpType: 'none' as BumpType, currentVersion: currentVersion.toString(), nextVersion: null, changelogOutput: null, releaseResult: null, dryRun: options.dryRun ?? false }
  }

  if (!ctx.nextVersion) {
    throw new BumpcraftError(ErrorCode.INVALID_VERSION, 'nextVersion was not set by the pipeline')
  }

  if (!options.dryRun) {
    const hookEnv = { BUMPCRAFT_VERSION: ctx.nextVersion.toString(), BUMPCRAFT_PREV_VERSION: currentVersion.toString(), BUMPCRAFT_BUMP_TYPE: ctx.bumpType }
    runHook(config, 'beforeRelease', logger, hookEnv)
    runHook(config, 'beforeBump', logger, hookEnv)
    await versionSource.write(ctx.nextVersion)
    runHook(config, 'afterBump', logger, hookEnv)
    const store = new HistoryStore(join('.bumpcraft', 'history.json'))
    await store.save({
      version: ctx.nextVersion.toString(),
      previousVersion: currentVersion.toString(),
      date: new Date().toISOString(),
      commits: ctx.parsedCommits,
      changelogOutput: ctx.changelogOutput ?? ''
    })

    // Write CHANGELOG.md — prepend new entry to existing file (atomic write)
    if (ctx.changelogOutput) {
      const changelogPath = 'CHANGELOG.md'
      let existing = ''
      try {
        existing = await readFile(changelogPath, 'utf-8')
      } catch { /* no existing changelog */ }

      const header = '# Changelog\n\n'
      const body = existing.startsWith('# Changelog')
        ? existing.replace(/^# Changelog\n*/, '')
        : existing

      const tmp = `${changelogPath}.tmp`
      await writeFile(tmp, `${header}${ctx.changelogOutput}\n${body}`, 'utf-8')
      await rename(tmp, changelogPath)
    }
    // Consume changeset files after successful release
    if (changesets.length > 0) {
      await consumeChangesets()
    }
    runHook(config, 'afterRelease', logger, hookEnv)
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

export async function runMonorepoRelease(options: ReleaseOptions = {}): Promise<MonorepoReleaseResult[]> {
  const config = await loadConfig(options.configPath ?? '.bumpcraftrc.json')
  const logger = new ConsoleLogger(options.verbose)

  if (!config.monorepo) {
    throw new BumpcraftError(ErrorCode.CONFIG_ERROR, 'monorepo is not configured in .bumpcraftrc.json')
  }

  const git = new GitClient()
  const latestTag = await git.getLatestTag()
  const ref = options.from ?? latestTag
  const allCommits = options._rawCommitsOverride ?? await git.getCommitsSince(ref)

  // Parse all commits to extract scopes
  const parsedAll = allCommits.map(raw => {
    const match = /^[a-fA-F0-9]+\s+\w+\(([^)]+)\)/.exec(raw.split('\n')[0])
    return { raw, scope: match?.[1] ?? null }
  })

  const packages = options.package
    ? { [options.package]: config.monorepo[options.package] }
    : config.monorepo

  if (options.package && !config.monorepo[options.package]) {
    throw new BumpcraftError(ErrorCode.CONFIG_ERROR, `Package "${options.package}" not found in monorepo config`)
  }

  const results: MonorepoReleaseResult[] = []

  const plugins = config.plugins.map(p => {
    const name = Array.isArray(p) ? p[0] : p
    return BUILT_IN_PLUGINS[name as keyof typeof BUILT_IN_PLUGINS]
  }).filter(Boolean)

  const forceBump = options.forceBump && VALID_BUMPS.includes(options.forceBump)
    ? options.forceBump as BumpType
    : undefined

  for (const [pkgName, pkgConfig] of Object.entries(packages)) {
    if (!pkgConfig) continue

    // Filter commits: scoped to this package OR unscoped (global)
    const pkgCommits = parsedAll
      .filter(c => c.scope === pkgName || c.scope === null)
      .map(c => c.raw)

    if (!pkgCommits.length && !forceBump) {
      continue
    }

    const tagFormat = pkgConfig.tagFormat ?? `${pkgName}@{version}`
    const pkgJsonPath = join(pkgConfig.path, 'package.json')

    // Read version from the PACKAGE's own package.json
    let pkgVersion: import('./core/semver.js').SemVer
    try {
      const content = await readFile(pkgJsonPath, 'utf-8')
      const pkg = JSON.parse(content)
      pkgVersion = (await import('./core/semver.js')).SemVer.parse(pkg.version ?? '0.0.0')
    } catch {
      pkgVersion = (await import('./core/semver.js')).SemVer.parse('0.0.0')
    }

    // Run pipeline to get bumpType and changelog
    let ctx: PipelineContext = {
      rawCommits: pkgCommits,
      parsedCommits: [],
      currentVersion: pkgVersion,
      nextVersion: null,
      bumpType: 'none',
      changelogOutput: null,
      releaseResult: null,
      config,
      dryRun: options.dryRun ?? false,
      logger
    }

    const nextVersionPlugin = {
      name: 'bumpcraft-internal-next-version',
      stage: 'resolve' as const,
      async execute(c: PipelineContext): Promise<PipelineContext> {
        const effectiveBump = forceBump ?? (c.bumpType === 'none' ? undefined : c.bumpType)
        if (!effectiveBump || effectiveBump === 'none') return c
        let next = pkgVersion
        if (effectiveBump === 'major') next = pkgVersion.bumpMajor()
        else if (effectiveBump === 'minor') next = pkgVersion.bumpMinor()
        else next = pkgVersion.bumpPatch()
        if (options.preRelease) next = next.bumpPreRelease(options.preRelease)
        return { ...c, bumpType: effectiveBump as BumpType, nextVersion: next }
      }
    }

    const runner = new PipelineRunner([...plugins, nextVersionPlugin])
    ctx = await runner.run(ctx)

    if (ctx.bumpType === 'none' || !ctx.nextVersion) {
      continue
    }

    const nextVersion = ctx.nextVersion.toString()

    if (!options.dryRun) {
      // Write version to the package's package.json (preserve indent)
      try {
        const content = await readFile(pkgJsonPath, 'utf-8')
        const pkg = JSON.parse(content)
        pkg.version = nextVersion
        const indentMatch = content.match(/^(\s+)"/m)
        const indent = indentMatch?.[1] ?? '  '
        const tmp = `${pkgJsonPath}.tmp`
        await writeFile(tmp, JSON.stringify(pkg, null, indent) + '\n', 'utf-8')
        await rename(tmp, pkgJsonPath)
      } catch (e) {
        logger.warn(`Failed to update ${pkgJsonPath}: ${e}`)
      }

      // Write package-specific CHANGELOG.md
      if (ctx.changelogOutput) {
        const changelogPath = join(pkgConfig.path, 'CHANGELOG.md')
        let existing = ''
        try { existing = await readFile(changelogPath, 'utf-8') } catch { /* */ }
        const header = '# Changelog\n\n'
        const body = existing.startsWith('# Changelog')
          ? existing.replace(/^# Changelog\n*/, '')
          : existing
        const tmp = `${changelogPath}.tmp`
        await writeFile(tmp, `${header}${ctx.changelogOutput}\n${body}`, 'utf-8')
        await rename(tmp, changelogPath)
      }

      // Save to history
      const store = new HistoryStore(join('.bumpcraft', 'history.json'))
      await store.save({
        version: `${pkgName}@${nextVersion}`,
        previousVersion: `${pkgName}@${pkgVersion.toString()}`,
        date: new Date().toISOString(),
        commits: ctx.parsedCommits,
        changelogOutput: ctx.changelogOutput ?? ''
      })

      // Create package-specific tag
      const tagName = tagFormat.replace('{version}', nextVersion)
      try {
        await git.createTag(tagName, `Release ${pkgName} ${nextVersion}`)
      } catch { /* tag may exist */ }
    }

    logger.info(`${pkgName}: ${pkgVersion.toString()} → ${nextVersion} (${ctx.bumpType})`)
    results.push({
      package: pkgName,
      bumpType: ctx.bumpType,
      currentVersion: pkgVersion.toString(),
      nextVersion,
      changelogOutput: ctx.changelogOutput
    })
  }

  // Inter-package dependency bumping: if a released package is a dependency
  // of another package, bump the dependent's version too (patch bump)
  if (!options.dryRun && results.length > 0 && config.monorepo) {
    const releasedNames = new Set(results.map(r => r.package))
    for (const [depName, depConfig] of Object.entries(config.monorepo)) {
      if (releasedNames.has(depName)) continue // already released
      const dc = depConfig as { path: string }
      try {
        const content = await readFile(join(dc.path, 'package.json'), 'utf-8')
        const pkg = JSON.parse(content)
        let needsBump = false
        for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
          const deps = pkg[depField] as Record<string, string> | undefined
          if (!deps) continue
          for (const released of results) {
            // Check if any dependency name matches a released package's npm name
            const releasedPkgJson = JSON.parse(await readFile(join((config.monorepo![released.package] as { path: string }).path, 'package.json'), 'utf-8'))
            const releasedNpmName = releasedPkgJson.name
            if (deps[releasedNpmName] && !deps[releasedNpmName].startsWith('workspace:')) {
              deps[releasedNpmName] = `^${released.nextVersion}`
              needsBump = true
            }
          }
        }
        if (needsBump) {
          const indentMatch = content.match(/^(\s+)"/m)
          const indent = indentMatch?.[1] ?? '  '
          const tmp = `${join(dc.path, 'package.json')}.tmp`
          await writeFile(tmp, JSON.stringify(pkg, null, indent) + '\n', 'utf-8')
          await rename(tmp, join(dc.path, 'package.json'))
          logger.info(`${depName}: updated dependency versions`)
        }
      } catch { /* */ }
    }
  }

  // Linked packages: if packages are in a linked group, they all get the highest version
  if (!options.dryRun && results.length > 0 && config.linked?.length) {
    for (const group of config.linked) {
      const groupResults = results.filter(r => group.includes(r.package))
      if (groupResults.length <= 1) continue

      // Find the highest version in the group
      const { SemVer } = await import('./core/semver.js')
      let highest = SemVer.parse(groupResults[0].nextVersion!)
      for (const r of groupResults.slice(1)) {
        const v = SemVer.parse(r.nextVersion!)
        if (v.gt(highest)) highest = v
      }

      // Set all packages in the group to the highest version
      for (const r of groupResults) {
        if (r.nextVersion === highest.toString()) continue
        r.nextVersion = highest.toString()
        const pkgPath = join((config.monorepo![r.package] as { path: string }).path, 'package.json')
        try {
          const content = await readFile(pkgPath, 'utf-8')
          const pkg = JSON.parse(content)
          pkg.version = highest.toString()
          const indentMatch = content.match(/^(\s+)"/m)
          const indent = indentMatch?.[1] ?? '  '
          const tmp = `${pkgPath}.tmp`
          await writeFile(tmp, JSON.stringify(pkg, null, indent) + '\n', 'utf-8')
          await rename(tmp, pkgPath)
          logger.info(`${r.package}: linked to ${highest.toString()}`)
        } catch { /* */ }
      }
    }
  }

  return results
}

export async function currentVersion(configPath?: string) {
  const config = await loadConfig(configPath ?? '.bumpcraftrc.json')
  const source = createVersionSource(config.versionSource)
  return (await source.read()).toString()
}
