import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

function setupRepo() {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-csrelease-'))
  execSync('git init -b main', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }))
  writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
    versionSource: 'package.json',
    plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
    branches: { release: ['main', 'master'], preRelease: {} },
    commitTypes: { feat: 'minor', fix: 'patch' },
    policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null }
  }))
  execSync('git add . && git commit -m "chore: init"', { cwd: dir })
  execSync('git tag v1.0.0', { cwd: dir })
  process.chdir(dir)
}

beforeEach(() => {
  vi.resetModules()
  originalCwd = process.cwd()
})

afterEach(() => {
  process.chdir(originalCwd)
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('Changeset files in release', () => {

  it('changeset file overrides commit-based bump when higher', async () => {
    setupRepo()
    // Commit says patch, changeset says major
    execSync('git commit --allow-empty -m "fix: small bug"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'big-change.md'), '---\n"root": major\n---\n\nComplete API redesign\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.bumpType).toBe('major')
    expect(result.nextVersion).toBe('2.0.0')
  })

  it('changeset file does not downgrade commit-based bump', async () => {
    setupRepo()
    // Commit says major (breaking), changeset says minor
    execSync('git commit --allow-empty -m "feat!: breaking change"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'mild.md'), '---\n"root": minor\n---\n\nSmall thing\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.bumpType).toBe('major')
    expect(result.nextVersion).toBe('2.0.0')
  })

  it('changeset file triggers release when commits produce no bump', async () => {
    setupRepo()
    // Only chore commits (no bump), but changeset requests minor
    execSync('git commit --allow-empty -m "chore: update deps"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'manual.md'), '---\n"root": minor\n---\n\nManual version bump for internal change\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.bumpType).toBe('minor')
    expect(result.nextVersion).toBe('1.1.0')
  })

  it('changeset summaries appear in changelog', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "feat: feature"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'note.md'), '---\n"root": minor\n---\n\nAdded support for X and Y\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.changelogOutput).toContain('Added support for X and Y')
  })

  it('changeset files are deleted after non-dry-run release', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "feat: feature"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'temp.md'), '---\n"root": minor\n---\n\nConsumed after release\n')

    const { runRelease } = await import('../../src/index.js')
    await runRelease({ dryRun: false })

    expect(existsSync(join(dir, '.changeset', 'temp.md'))).toBe(false)
  })

  it('changeset files are NOT deleted on dry-run', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "feat: feature"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'keep.md'), '---\n"root": minor\n---\n\nShould survive dry-run\n')

    const { runRelease } = await import('../../src/index.js')
    await runRelease({ dryRun: true })

    expect(existsSync(join(dir, '.changeset', 'keep.md'))).toBe(true)
  })

  it('multiple changeset files are merged — highest bump wins', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "chore: nothing"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    writeFileSync(join(dir, '.changeset', 'a.md'), '---\n"root": patch\n---\n\nSmall fix\n')
    writeFileSync(join(dir, '.changeset', 'b.md'), '---\n"root": minor\n---\n\nNew feature\n')
    writeFileSync(join(dir, '.changeset', 'c.md'), '---\n"root": patch\n---\n\nAnother fix\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.bumpType).toBe('minor') // highest of patch, minor, patch
    expect(result.nextVersion).toBe('1.1.0')
  })

  it('no changeset files + no commits = no release', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "chore: nothing"', { cwd: dir })

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    expect(result.bumpType).toBe('none')
  })

  it('changeset with no matching root package still works for single-package', async () => {
    setupRepo()
    execSync('git commit --allow-empty -m "chore: nothing"', { cwd: dir })
    mkdirSync(join(dir, '.changeset'), { recursive: true })
    // Package name "unknown-pkg" doesn't match anything, but bump type is taken from highest
    writeFileSync(join(dir, '.changeset', 'weird.md'), '---\n"unknown-pkg": major\n---\n\nWeird changeset\n')

    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })

    // Should still bump — changeset requests major regardless of package name in single-package mode
    expect(result.bumpType).toBe('major')
  })
})
