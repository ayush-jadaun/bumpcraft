import { describe, it, expect } from 'vitest'
import { SemVer } from '../../src/core/semver.js'

describe('SemVer.parse', () => {
  it('parses basic version', () => {
    const v = SemVer.parse('1.2.3')
    expect(v.major).toBe(1)
    expect(v.minor).toBe(2)
    expect(v.patch).toBe(3)
    expect(v.preRelease).toBeNull()
  })

  it('parses pre-release', () => {
    const v = SemVer.parse('1.0.0-alpha.1')
    expect(v.preRelease).toBe('alpha.1')
  })

  it('parses build metadata', () => {
    const v = SemVer.parse('1.0.0+build.123')
    expect(v.buildMetadata).toBe('build.123')
  })

  it('throws on invalid version', () => {
    expect(() => SemVer.parse('not-a-version')).toThrow()
  })
})

describe('SemVer.toString', () => {
  it('serializes basic version', () => {
    expect(SemVer.parse('1.2.3').toString()).toBe('1.2.3')
  })

  it('serializes with pre-release', () => {
    expect(SemVer.parse('1.0.0-beta.2').toString()).toBe('1.0.0-beta.2')
  })
})

describe('SemVer comparisons', () => {
  it('gt returns true when left > right', () => {
    expect(SemVer.parse('2.0.0').gt(SemVer.parse('1.9.9'))).toBe(true)
  })

  it('lt returns true when left < right', () => {
    expect(SemVer.parse('1.0.0').lt(SemVer.parse('1.0.1'))).toBe(true)
  })

  it('eq returns true when equal', () => {
    expect(SemVer.parse('1.2.3').eq(SemVer.parse('1.2.3'))).toBe(true)
  })
})

describe('SemVer bumps', () => {
  it('bumps major and resets minor and patch', () => {
    const v = SemVer.parse('1.2.3').bumpMajor()
    expect(v.toString()).toBe('2.0.0')
  })

  it('bumps minor and resets patch', () => {
    const v = SemVer.parse('1.2.3').bumpMinor()
    expect(v.toString()).toBe('1.3.0')
  })

  it('bumps patch', () => {
    const v = SemVer.parse('1.2.3').bumpPatch()
    expect(v.toString()).toBe('1.2.4')
  })

  it('bumps pre-release with tag', () => {
    const v = SemVer.parse('1.2.3').bumpMinor().bumpPreRelease('beta')
    expect(v.toString()).toBe('1.3.0-beta.1')
  })

  it('increments existing pre-release counter', () => {
    const v = SemVer.parse('1.3.0-beta.1').bumpPreRelease('beta')
    expect(v.toString()).toBe('1.3.0-beta.2')
  })
})
