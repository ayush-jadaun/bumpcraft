import { describe, it, expect } from 'vitest'
import { conventionalCommitsPlugin } from '../../../src/plugins/conventional-commits.js'
import { SemVer } from '../../../src/core/semver.js'
import { defaultConfig } from '../../../src/core/config.js'
import { noopLogger } from '../../../src/core/logger.js'
import type { PipelineContext } from '../../../src/pipeline/types.js'

const ctx = (rawCommits: string[]): PipelineContext => ({
  rawCommits, parsedCommits: [], currentVersion: SemVer.parse('1.0.0'),
  nextVersion: null, bumpType: 'none', changelogOutput: null,
  releaseResult: null, config: defaultConfig, dryRun: false, logger: noopLogger
})

describe('Commit parser edge cases', () => {
  // No colon
  it('rejects commit with no colon: feat add something', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat add something']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Empty scope
  it('rejects empty scope: feat(): something', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat(): something']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Nested parens
  it('rejects nested parens: feat(core(v2)): something', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat(core(v2)): something']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Breaking variants
  it('detects feat!: as breaking', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat!: breaking change']))
    expect(r.parsedCommits[0].breaking).toBe(true)
    expect(r.bumpType).toBe('major')
  })

  it('detects feat(core)!: as breaking with scope', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat(core)!: breaking scoped']))
    expect(r.parsedCommits[0].breaking).toBe(true)
    expect(r.parsedCommits[0].scope).toBe('core')
    expect(r.bumpType).toBe('major')
  })

  it('detects BREAKING CHANGE footer in body', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: thing\n\nBREAKING CHANGE: removed API']))
    expect(r.parsedCommits[0].breaking).toBe(true)
    expect(r.bumpType).toBe('major')
  })

  // Scope with hyphens
  it('parses scope with hyphens: fix(db-postgres)', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 fix(db-postgres): fix query']))
    expect(r.parsedCommits[0].scope).toBe('db-postgres')
    expect(r.bumpType).toBe('patch')
  })

  // Scope with slashes
  it('parses scope with slashes: fix(oauth-providers/google)', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 fix(oauth-providers/google): fix OAuth']))
    expect(r.parsedCommits[0].scope).toBe('oauth-providers/google')
  })

  // Unicode/emoji
  it('handles emoji in subject', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat(core): add 🔐 encryption']))
    expect(r.parsedCommits[0].subject).toBe('add 🔐 encryption')
  })

  // Empty commit
  it('rejects empty commit message', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Whitespace only after colon
  it('rejects commit with only whitespace after colon: feat:   ', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat:   ']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Merge commits
  it('rejects merge commit', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 Merge pull request #123 from feature-branch']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Revert commits
  it('rejects revert commit', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 Revert "feat(core): something"']))
    expect(r.parsedCommits).toHaveLength(0)
  })

  // Multi-line commit
  it('parses multi-line commit, body on second line', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: add feature\n\nDetailed description here']))
    expect(r.parsedCommits[0].subject).toBe('add feature')
    expect(r.parsedCommits[0].body).toBe('Detailed description here')
  })

  // Very long commit message
  it('handles very long commit subject (500+ chars)', async () => {
    const longSubject = 'a'.repeat(500)
    const r = await conventionalCommitsPlugin.execute(ctx([`abc123 feat: ${longSubject}`]))
    expect(r.parsedCommits[0].subject).toBe(longSubject)
  })

  // Markdown special chars in commit
  it('handles markdown special chars in subject', async () => {
    const r = await conventionalCommitsPlugin.execute(ctx(['abc123 fix: handle `backticks` and **bold**']))
    expect(r.parsedCommits[0].subject).toContain('`backticks`')
    expect(r.parsedCommits[0].subject).toContain('**bold**')
  })

  // Custom commit type that maps to patch
  it('custom commitTypes override works', async () => {
    const customConfig = { ...defaultConfig, commitTypes: { ...defaultConfig.commitTypes, perf: 'patch' as const } }
    const c: PipelineContext = { ...ctx(['abc123 perf: optimize query']), config: customConfig }
    const r = await conventionalCommitsPlugin.execute(c)
    expect(r.bumpType).toBe('patch')
  })

  // commitTypes with feat: none disables feat bumps
  it('commitTypes can disable feat bumps', async () => {
    const customConfig = { ...defaultConfig, commitTypes: { ...defaultConfig.commitTypes, feat: 'none' as const } }
    const c: PipelineContext = { ...ctx(['abc123 feat: add feature']), config: customConfig }
    const r = await conventionalCommitsPlugin.execute(c)
    expect(r.bumpType).toBe('none')
  })
})
