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
  // Basic parsing
  it('parses feat commit', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: add dark mode']))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'feat', subject: 'add dark mode', breaking: false })
  })

  it('parses scoped commit', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 fix(auth): token expiry']))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'fix', scope: 'auth', subject: 'token expiry' })
  })

  it('sets bumpType to minor for feat', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat: something']))
    expect(result.bumpType).toBe('minor')
  })

  // Breaking change detection
  it('detects ! shorthand as breaking', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat!: redesign API']))
    expect(result.parsedCommits[0].breaking).toBe(true)
    expect(result.bumpType).toBe('major')
  })

  it('detects BREAKING CHANGE in body', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat: new API\n\nBREAKING CHANGE: old endpoint removed'])
    )
    expect(result.parsedCommits[0].breaking).toBe(true)
    expect(result.bumpType).toBe('major')
  })

  it('detects BREAKING CHANGE with both ! and body', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat!: breaking\n\nBREAKING CHANGE: yes'])
    )
    expect(result.bumpType).toBe('major')
  })

  // Non-conventional commits
  it('skips commit with no type prefix', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 update readme']))
    expect(result.parsedCommits).toHaveLength(0)
    expect(result.bumpType).toBe('none')
  })

  it('skips empty commit message', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['']))
    expect(result.parsedCommits).toHaveLength(0)
  })

  it('skips merge commits without conventional prefix', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(["abc123 Merge pull request #42 from feature-branch"])
    )
    expect(result.parsedCommits).toHaveLength(0)
  })

  // Scope edge cases
  it('handles scope with slash (api/v2)', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 feat(api/v2): add endpoint']))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'feat', scope: 'api/v2', subject: 'add endpoint' })
  })

  it('handles scope with hyphen', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['abc123 fix(user-auth): token bug']))
    expect(result.parsedCommits[0].scope).toBe('user-auth')
  })

  // Multi-line / trailer handling
  it('handles multi-line commit with Co-Authored-By trailer', async () => {
    const raw = 'abc123 feat: add feature\n\nDetailed description.\n\nCo-Authored-By: Someone <someone@example.com>'
    const result = await conventionalCommitsPlugin.execute(ctx([raw]))
    expect(result.parsedCommits[0]).toMatchObject({ type: 'feat', subject: 'add feature', breaking: false })
    expect(result.parsedCommits[0].body).toContain('Co-Authored-By')
  })

  it('BREAKING CHANGE in body with other trailers still detected', async () => {
    const raw = 'abc123 feat: new thing\n\nBREAKING CHANGE: removed old API\n\nSigned-off-by: Dev <dev@test.com>'
    const result = await conventionalCommitsPlugin.execute(ctx([raw]))
    expect(result.parsedCommits[0].breaking).toBe(true)
  })

  // Multiple commits — bump type resolution
  it('multiple feat commits still bump minor once', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([
      'abc123 feat: feature one',
      'bbb456 feat: feature two',
      'ccc789 feat: feature three'
    ]))
    expect(result.parsedCommits).toHaveLength(3)
    expect(result.bumpType).toBe('minor')
  })

  it('mixed commits resolve to highest bump type', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([
      'abc123 fix: small bug',
      'bbb456 feat: new feature',
      'ccc789 chore: update deps'
    ]))
    expect(result.bumpType).toBe('minor')
  })

  it('breaking in any commit makes it major', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([
      'abc123 fix: small bug',
      'bbb456 feat!: breaking change',
      'ccc789 feat: normal feature'
    ]))
    expect(result.bumpType).toBe('major')
  })

  it('all chore/docs commits produce no bump', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([
      'abc123 chore: update deps',
      'bbb456 docs: update readme',
      'ccc789 test: add tests'
    ]))
    expect(result.bumpType).toBe('none')
  })

  // Empty input
  it('empty commit list produces no bump', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([]))
    expect(result.parsedCommits).toHaveLength(0)
    expect(result.bumpType).toBe('none')
  })

  // Uppercase hex hash
  it('handles uppercase hex in commit hash', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['ABC123 feat: uppercase hash']))
    expect(result.parsedCommits[0]).toMatchObject({ hash: 'ABC123', type: 'feat' })
  })

  it('handles mixed case hex hash', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx(['aBcDeF feat: mixed case']))
    expect(result.parsedCommits[0].hash).toBe('aBcDeF')
  })

  // Squash merge with PR number
  it('handles squash merge with PR number in subject', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat: add user profiles (#42)'])
    )
    expect(result.parsedCommits[0]).toMatchObject({ type: 'feat', subject: 'add user profiles (#42)' })
    expect(result.bumpType).toBe('minor')
  })

  // Emoji in commit message
  it('handles emoji in commit subject', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 feat: ✨ add sparkle effect'])
    )
    expect(result.parsedCommits[0].subject).toBe('✨ add sparkle effect')
    expect(result.bumpType).toBe('minor')
  })

  // Extra whitespace
  it('trims extra whitespace in subject', async () => {
    const result = await conventionalCommitsPlugin.execute(
      ctx(['abc123 fix:   lots of spaces   '])
    )
    expect(result.parsedCommits[0].subject).toBe('lots of spaces')
  })

  // Commit with only hash (garbage input)
  it('skips garbage input gracefully', async () => {
    const result = await conventionalCommitsPlugin.execute(ctx([
      'abc123',
      '   ',
      'abc123 feat: valid one'
    ]))
    expect(result.parsedCommits).toHaveLength(1)
    expect(result.parsedCommits[0].subject).toBe('valid one')
  })
})
