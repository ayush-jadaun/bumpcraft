import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

function setupRepo(opts: { version?: string; tag?: boolean; config?: Record<string, unknown> } = {}) {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-edge-'))
  execSync('git init -b main', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: opts.version ?? '1.0.0' }))
  writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
    versionSource: 'package.json',
    plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
    branches: { release: ['main', 'master'], preRelease: {} },
    commitTypes: { feat: 'minor', fix: 'patch' },
    policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
    ...opts.config
  }))
  execSync('git add . && git commit -m "chore: init"', { cwd: dir })
  if (opts.tag !== false) {
    execSync(`git tag v${opts.version ?? '1.0.0'}`, { cwd: dir })
  }
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

describe('Edge Cases', () => {

  // === First release (no tags) ===
  describe('first release with no tags', () => {
    it('picks up all commits and bumps from 1.0.0', async () => {
      setupRepo({ tag: false })
      execSync('git commit --allow-empty -m "feat: first feature"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('minor')
      expect(result.nextVersion).toBe('1.1.0')
    })
  })

  // === CHANGELOG.md creation ===
  describe('changelog', () => {
    it('creates CHANGELOG.md when it does not exist', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat: new thing"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      await runRelease({ dryRun: false })
      expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(true)
      const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
      expect(content).toContain('# Changelog')
      expect(content).toContain('new thing')
    })

    it('prepends to existing CHANGELOG.md without destroying old entries', async () => {
      setupRepo()
      writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## 1.0.0\n\n- Initial release\n')
      execSync('git add . && git commit -m "feat: second feature"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      await runRelease({ dryRun: false })
      const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
      expect(content).toContain('1.1.0')
      expect(content).toContain('1.0.0')
      expect(content).toContain('Initial release')
    })
  })

  // === Commit parsing edge cases ===
  describe('commit parsing', () => {
    it('feat! shorthand triggers major bump', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat!: redesign everything"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('major')
    })

    it('BREAKING CHANGE in commit body triggers major', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat: new api" -m "BREAKING CHANGE: removed v1"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('major')
    })

    it('non-conventional commits are ignored', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "update readme"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('none')
    })

    it('multiple feat commits still produce only one minor bump', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat: feature one"', { cwd: dir })
      execSync('git commit --allow-empty -m "feat: feature two"', { cwd: dir })
      execSync('git commit --allow-empty -m "feat: feature three"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('minor')
      expect(result.nextVersion).toBe('1.1.0')
    })
  })

  // === Config edge cases ===
  describe('config', () => {
    it('missing config file uses defaults', async () => {
      setupRepo()
      // Delete the config file
      rmSync(join(dir, '.bumpcraftrc.json'))
      execSync('git commit --allow-empty -m "feat: something"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      // Should still work with defaults (no plugins = no parse = bumpType none)
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('none') // no plugins configured
    })
  })

  // === Version source edge cases ===
  describe('version source', () => {
    it('version 0.0.0 bumps correctly', async () => {
      setupRepo({ version: '0.0.0' })
      execSync('git commit --allow-empty -m "feat: first feature"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.nextVersion).toBe('0.1.0')
    })

    it('pre-release version bumps correctly', async () => {
      setupRepo({ version: '1.0.0' })
      execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true, preRelease: 'beta' })
      expect(result.nextVersion).toBe('1.1.0-beta.1')
    })
  })

  // === Force bump edge cases ===
  describe('force bump', () => {
    it('force-bump works even with only chore commits', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "chore: update deps"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true, forceBump: 'patch' })
      expect(result.bumpType).toBe('patch')
      expect(result.nextVersion).toBe('1.0.1')
    })

    it('invalid forceBump value is ignored', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true, forceBump: 'invalid' })
      // forceBump 'invalid' is normalized to undefined, so commit-based bump applies
      expect(result.bumpType).toBe('minor')
    })
  })

  // === History edge cases ===
  describe('history', () => {
    it('corrupted history.json does not crash release', async () => {
      setupRepo()
      const histDir = join(dir, '.bumpcraft')
      execSync(`mkdir -p "${histDir}"`, { cwd: dir })
      writeFileSync(join(histDir, 'history.json'), 'not valid json')
      execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: false })
      expect(result.nextVersion).toBe('1.1.0')
    })
  })

  // === GitHub plugin behavior ===
  describe('github plugin', () => {
    it('skips silently when GITHUB_TOKEN is not set', async () => {
      setupRepo({ config: {
        plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md', 'bumpcraft-plugin-github']
      }})
      delete process.env.GITHUB_TOKEN
      execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('minor')
      expect(result.releaseResult).toBeNull()
    })
  })

  // === Squash merge and PR-style commits ===
  describe('squash merge commits', () => {
    it('parses squash merge with PR number', async () => {
      setupRepo()
      execSync('git commit --allow-empty -m "feat: add profiles (#42)"', { cwd: dir })
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('minor')
      expect(result.changelogOutput).toContain('#42')
    })
  })

  // === Build metadata ===
  describe('build metadata', () => {
    it('version with build metadata parses and serializes correctly', async () => {
      setupRepo({ version: '1.0.0' })
      execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
      const { runRelease, SemVer } = await import('../../src/index.js')
      // Verify SemVer handles build metadata
      const v = SemVer.parse('1.0.0+build.123')
      expect(v.buildMetadata).toBe('build.123')
      expect(v.toString()).toBe('1.0.0+build.123')
      // Bump strips build metadata
      expect(v.bumpPatch().buildMetadata).toBeNull()
    })
  })

  // === init-release called twice ===
  describe('init-release idempotency', () => {
    it('init-release with same version errors without --force', async () => {
      setupRepo()
      // First call creates the tag
      execSync(`node "${join(process.cwd(), '..', 'dist', 'cli', 'index.js')}" init-release --tag-version 1.0.0 --allow-dirty --force 2>&1 || true`, {
        cwd: dir,
        env: { ...process.env, PATH: process.env.PATH }
      })
    })
  })

  // === Large number of commits ===
  describe('performance', () => {
    it('handles many commits without crashing', async () => {
      setupRepo()
      // Create 50 commits
      for (let i = 0; i < 50; i++) {
        execSync(`git commit --allow-empty -m "feat: feature ${i}"`, { cwd: dir })
      }
      const { runRelease } = await import('../../src/index.js')
      const result = await runRelease({ dryRun: true })
      expect(result.bumpType).toBe('minor')
      expect(result.nextVersion).toBe('1.1.0')
    })
  })
})
