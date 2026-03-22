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

  it('parses pre-release with build metadata', () => {
    const v = SemVer.parse('1.0.0-beta.1+build.456')
    expect(v.preRelease).toBe('beta.1')
    expect(v.buildMetadata).toBe('build.456')
  })

  it('handles large version numbers', () => {
    const v = SemVer.parse('99.99.99')
    expect(v.major).toBe(99)
    expect(v.minor).toBe(99)
    expect(v.patch).toBe(99)
  })

  it('handles very large numbers', () => {
    const v = SemVer.parse('999.0.0')
    expect(v.bumpMajor().toString()).toBe('1000.0.0')
  })

  it('throws on invalid version', () => {
    expect(() => SemVer.parse('not-a-version')).toThrow()
  })

  it('throws on empty string', () => {
    expect(() => SemVer.parse('')).toThrow()
  })

  it('trims whitespace', () => {
    const v = SemVer.parse('  1.2.3  ')
    expect(v.toString()).toBe('1.2.3')
  })
})

describe('SemVer.toString', () => {
  it('serializes basic version', () => {
    expect(SemVer.parse('1.2.3').toString()).toBe('1.2.3')
  })

  it('serializes with pre-release', () => {
    expect(SemVer.parse('1.0.0-beta.2').toString()).toBe('1.0.0-beta.2')
  })

  it('serializes with build metadata', () => {
    expect(SemVer.parse('1.0.0+build.123').toString()).toBe('1.0.0+build.123')
  })

  it('serializes with both pre-release and build metadata', () => {
    expect(SemVer.parse('1.0.0-rc.1+sha.abc').toString()).toBe('1.0.0-rc.1+sha.abc')
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

  it('pre-release alpha.1 < alpha.2', () => {
    expect(SemVer.parse('1.0.0-alpha.1').lt(SemVer.parse('1.0.0-alpha.2'))).toBe(true)
  })

  it('pre-release alpha < beta', () => {
    expect(SemVer.parse('1.0.0-alpha').lt(SemVer.parse('1.0.0-beta'))).toBe(true)
  })

  it('pre-release versions are not equal when tags differ', () => {
    expect(SemVer.parse('1.0.0-alpha.1').eq(SemVer.parse('1.0.0-alpha.2'))).toBe(false)
  })

  it('pre-release < release (1.0.0-alpha < 1.0.0)', () => {
    expect(SemVer.parse('1.0.0-alpha').lt(SemVer.parse('1.0.0'))).toBe(true)
  })

  it('release > pre-release (1.0.0 > 1.0.0-rc.1)', () => {
    expect(SemVer.parse('1.0.0').gt(SemVer.parse('1.0.0-rc.1'))).toBe(true)
  })

  it('numeric pre-release < alphanumeric (spec §11.4.1)', () => {
    expect(SemVer.parse('1.0.0-1').lt(SemVer.parse('1.0.0-alpha'))).toBe(true)
  })

  it('build metadata is ignored in comparison', () => {
    expect(SemVer.parse('1.0.0+build.1').eq(SemVer.parse('1.0.0+build.2'))).toBe(true)
  })

  it('fewer pre-release fields < more fields', () => {
    expect(SemVer.parse('1.0.0-alpha').lt(SemVer.parse('1.0.0-alpha.1'))).toBe(true)
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

  it('switches pre-release tag resets to 1', () => {
    const v = SemVer.parse('1.3.0-alpha.5').bumpPreRelease('beta')
    expect(v.toString()).toBe('1.3.0-beta.1')
  })

  it('bump strips pre-release and build metadata', () => {
    const v = SemVer.parse('1.0.0-beta.1+build.5').bumpPatch()
    expect(v.toString()).toBe('1.0.1')
  })

  it('large version bumps correctly', () => {
    expect(SemVer.parse('99.99.99').bumpPatch().toString()).toBe('99.99.100')
    expect(SemVer.parse('99.99.99').bumpMinor().toString()).toBe('99.100.0')
    expect(SemVer.parse('99.99.99').bumpMajor().toString()).toBe('100.0.0')
  })
})
