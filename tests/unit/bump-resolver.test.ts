import { describe, it, expect } from 'vitest'
import { resolveBump } from '../../src/core/bump-resolver.js'
import type { ParsedCommit } from '../../src/pipeline/types.js'

const commit = (overrides: Partial<ParsedCommit>): ParsedCommit => ({
  hash: 'abc123',
  type: 'chore',
  scope: null,
  subject: 'test',
  body: null,
  breaking: false,
  raw: 'chore: test',
  ...overrides
})

describe('resolveBump', () => {
  it('returns none when no commits', () => {
    expect(resolveBump([], {})).toBe('none')
  })

  it('returns patch for fix commits', () => {
    expect(resolveBump([commit({ type: 'fix' })], { fix: 'patch' })).toBe('patch')
  })

  it('returns minor for feat commits', () => {
    expect(resolveBump([commit({ type: 'feat' })], { feat: 'minor' })).toBe('minor')
  })

  it('returns major for breaking changes', () => {
    expect(resolveBump([commit({ breaking: true })], {})).toBe('major')
  })

  it('returns highest priority across multiple commits', () => {
    const commits = [
      commit({ type: 'fix' }),
      commit({ type: 'feat' }),
      commit({ type: 'chore' })
    ]
    expect(resolveBump(commits, { fix: 'patch', feat: 'minor', chore: 'none' })).toBe('minor')
  })

  it('unknown commit type returns none', () => {
    expect(resolveBump([commit({ type: 'unknown' })], {})).toBe('none')
  })
})
