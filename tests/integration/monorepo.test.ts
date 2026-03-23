import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

function setupMonorepo(opts: { thirdPkg?: boolean; customTags?: boolean } = {}) {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-monorepo-'))
  execSync('git init -b main', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })

  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'monorepo-root', version: '0.0.0', private: true }))

  mkdirSync(join(dir, 'packages', 'auth'), { recursive: true })
  writeFileSync(join(dir, 'packages', 'auth', 'package.json'), JSON.stringify({ name: '@mono/auth', version: '1.0.0' }))

  mkdirSync(join(dir, 'packages', 'api'), { recursive: true })
  writeFileSync(join(dir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@mono/api', version: '2.0.0' }))

  const monorepo: Record<string, { path: string; tagFormat?: string }> = {
    auth: { path: 'packages/auth' },
    api: { path: 'packages/api' }
  }

  if (opts.thirdPkg) {
    mkdirSync(join(dir, 'packages', 'ui'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'ui', 'package.json'), JSON.stringify({ name: '@mono/ui', version: '0.1.0' }))
    monorepo.ui = { path: 'packages/ui' }
  }

  if (opts.customTags) {
    monorepo.auth.tagFormat = '@mono/auth@{version}'
    monorepo.api.tagFormat = '@mono/api@{version}'
  }

  writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
    versionSource: 'package.json',
    plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
    branches: { release: ['main', 'master'], preRelease: {} },
    commitTypes: { feat: 'minor', fix: 'patch' },
    policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
    monorepo
  }))

  execSync('git add . && git commit -m "chore: init monorepo"', { cwd: dir })
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

describe('Monorepo release', () => {

  // === Basic scoping ===

  it('releases only the package matching the commit scope', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): add OAuth"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    const authResult = results.find(r => r.package === 'auth')
    expect(authResult).toBeDefined()
    expect(authResult!.bumpType).toBe('minor')
  })

  it('unscoped commits apply to all packages', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat: global feature"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.find(r => r.package === 'auth')).toBeDefined()
    expect(results.find(r => r.package === 'api')).toBeDefined()
  })

  it('scoped commit to one package does not bump the other', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): only auth"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results.find(r => r.package === 'api')).toBeUndefined()
  })

  it('mixed scoped and unscoped commits work together', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): auth feature"', { cwd: dir })
    execSync('git commit --allow-empty -m "fix: global fix"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    const authResult = results.find(r => r.package === 'auth')
    const apiResult = results.find(r => r.package === 'api')
    expect(authResult!.bumpType).toBe('minor') // feat(auth) + fix → minor wins
    expect(apiResult!.bumpType).toBe('patch')  // only the unscoped fix
  })

  // === --package filter ===

  it('--package flag releases only the specified package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat: global thing"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, package: 'auth' })
    expect(results).toHaveLength(1)
    expect(results[0].package).toBe('auth')
  })

  it('throws when --package specifies a non-existent package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await expect(runMonorepoRelease({ dryRun: true, package: 'nope' })).rejects.toThrow(/not found/)
  })

  // === Config validation ===

  it('throws when monorepo is not configured', async () => {
    setupMonorepo()
    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null }
    }))
    const { runMonorepoRelease } = await import('../../src/index.js')
    await expect(runMonorepoRelease({ dryRun: true })).rejects.toThrow(/monorepo/)
  })

  // === Version correctness ===

  it('bumps from the PACKAGE version not root version', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): new feature"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, package: 'auth' })
    // auth is at 1.0.0, minor bump → 1.1.0 (NOT 0.1.0 from root)
    expect(results[0].currentVersion).toBe('1.0.0')
    expect(results[0].nextVersion).toBe('1.1.0')
  })

  it('each package bumps independently from its own version', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "fix: global fix"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    const auth = results.find(r => r.package === 'auth')!
    const api = results.find(r => r.package === 'api')!
    // auth: 1.0.0 → 1.0.1, api: 2.0.0 → 2.0.1
    expect(auth.currentVersion).toBe('1.0.0')
    expect(auth.nextVersion).toBe('1.0.1')
    expect(api.currentVersion).toBe('2.0.0')
    expect(api.nextVersion).toBe('2.0.1')
  })

  // === Breaking changes ===

  it('breaking change in scoped commit bumps that package major', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(api)!: redesign endpoints"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    const apiResult = results.find(r => r.package === 'api')!
    expect(apiResult.bumpType).toBe('major')
    expect(apiResult.nextVersion).toBe('3.0.0')
    // auth should not be affected
    expect(results.find(r => r.package === 'auth')).toBeUndefined()
  })

  it('breaking change in unscoped commit bumps ALL packages major', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat!: complete rewrite"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results.find(r => r.package === 'auth')!.bumpType).toBe('major')
    expect(results.find(r => r.package === 'api')!.bumpType).toBe('major')
    expect(results.find(r => r.package === 'auth')!.nextVersion).toBe('2.0.0')
    expect(results.find(r => r.package === 'api')!.nextVersion).toBe('3.0.0')
  })

  it('BREAKING CHANGE in commit body scoped to one package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): new auth" -m "BREAKING CHANGE: removed password login"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results.find(r => r.package === 'auth')!.bumpType).toBe('major')
    expect(results.find(r => r.package === 'api')).toBeUndefined()
  })

  // === File writes (non-dry-run) ===

  it('writes package-specific CHANGELOG.md', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): add login"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false, package: 'auth' })
    const changelogPath = join(dir, 'packages', 'auth', 'CHANGELOG.md')
    expect(existsSync(changelogPath)).toBe(true)
    expect(readFileSync(changelogPath, 'utf-8')).toContain('add login')
  })

  it('updates package-specific package.json version', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): new feature"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false, package: 'auth' })
    const pkg = JSON.parse(readFileSync(join(dir, 'packages', 'auth', 'package.json'), 'utf-8'))
    expect(pkg.version).toBe('1.1.0')
  })

  it('does NOT update the other package package.json', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): only auth"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false })
    const apiPkg = JSON.parse(readFileSync(join(dir, 'packages', 'api', 'package.json'), 'utf-8'))
    expect(apiPkg.version).toBe('2.0.0') // unchanged
  })

  it('creates package-specific git tag', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "fix(api): patch bug"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false, package: 'api' })
    const tags = execSync('git tag -l', { cwd: dir }).toString().trim().split('\n')
    expect(tags.some(t => t.startsWith('api@'))).toBe(true)
  })

  it('does NOT create a tag for the unchanged package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): only auth"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false })
    const tags = execSync('git tag -l', { cwd: dir }).toString().trim().split('\n')
    expect(tags.some(t => t.startsWith('auth@'))).toBe(true)
    expect(tags.some(t => t.startsWith('api@'))).toBe(false)
  })

  // === Custom tag format ===

  it('uses custom tagFormat when configured', async () => {
    setupMonorepo({ customTags: true })
    execSync('git commit --allow-empty -m "fix(auth): bug"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false, package: 'auth' })
    const tags = execSync('git tag -l', { cwd: dir }).toString().trim().split('\n')
    expect(tags.some(t => t === '@mono/auth@1.0.1')).toBe(true)
  })

  // === No changes ===

  it('returns empty array when no packages have changes', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "chore: nothing important"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results).toHaveLength(0)
  })

  // === Three packages ===

  it('handles 3+ packages correctly', async () => {
    setupMonorepo({ thirdPkg: true })
    execSync('git commit --allow-empty -m "feat(ui): add button"', { cwd: dir })
    execSync('git commit --allow-empty -m "fix(api): timeout"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results.find(r => r.package === 'ui')!.bumpType).toBe('minor')
    expect(results.find(r => r.package === 'api')!.bumpType).toBe('patch')
    expect(results.find(r => r.package === 'auth')).toBeUndefined() // no auth commits
  })

  // === Force bump in monorepo ===

  it('--force-bump applies to the filtered package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "chore: deps"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, package: 'auth', forceBump: 'major' })
    expect(results).toHaveLength(1)
    expect(results[0].bumpType).toBe('major')
    expect(results[0].nextVersion).toBe('2.0.0')
  })

  // === Commit to scope that doesn't match any package ===

  it('commits scoped to unknown package are ignored', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(database): add migration"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    // "database" scope matches no configured package, and no unscoped commits exist
    expect(results).toHaveLength(0)
  })

  // === Multiple commits to same package ===

  it('multiple commits to same package produce one release', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): feature one"', { cwd: dir })
    execSync('git commit --allow-empty -m "fix(auth): bugfix"', { cwd: dir })
    execSync('git commit --allow-empty -m "feat(auth): feature two"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })
    expect(results).toHaveLength(1)
    expect(results[0].package).toBe('auth')
    expect(results[0].bumpType).toBe('minor') // feat > fix → minor
    expect(results[0].nextVersion).toBe('1.1.0') // not 1.3.0
  })

  // === Changelog isolation ===

  it('package changelog only contains that package commits', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): auth thing"', { cwd: dir })
    execSync('git commit --allow-empty -m "feat(api): api thing"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false })

    const authChangelog = readFileSync(join(dir, 'packages', 'auth', 'CHANGELOG.md'), 'utf-8')
    const apiChangelog = readFileSync(join(dir, 'packages', 'api', 'CHANGELOG.md'), 'utf-8')

    expect(authChangelog).toContain('auth thing')
    expect(authChangelog).not.toContain('api thing')
    expect(apiChangelog).toContain('api thing')
    expect(apiChangelog).not.toContain('auth thing')
  })

  // === Dry run does NOT write files ===

  it('dry run does not modify any files', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): something"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: true })

    const pkg = JSON.parse(readFileSync(join(dir, 'packages', 'auth', 'package.json'), 'utf-8'))
    expect(pkg.version).toBe('1.0.0') // unchanged
    expect(existsSync(join(dir, 'packages', 'auth', 'CHANGELOG.md'))).toBe(false)
    const tags = execSync('git tag -l', { cwd: dir }).toString().trim().split('\n')
    expect(tags.some(t => t.startsWith('auth@'))).toBe(false)
  })

  // === Pre-release in monorepo ===

  it('pre-release flag works per package', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): beta feature"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, preRelease: 'beta', package: 'auth' })
    expect(results[0].nextVersion).toBe('1.1.0-beta.1')
  })

  // === Package with version 0.0.0 (fresh package) ===

  it('fresh package at 0.0.0 bumps correctly', async () => {
    setupMonorepo({ thirdPkg: true })
    // ui is at 0.1.0
    writeFileSync(join(dir, 'packages', 'ui', 'package.json'), JSON.stringify({ name: '@mono/ui', version: '0.0.0' }))
    execSync('git add . && git commit -m "feat(ui): first feature"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, package: 'ui' })
    expect(results[0].currentVersion).toBe('0.0.0')
    expect(results[0].nextVersion).toBe('0.1.0')
  })

  // === Missing package.json ===

  it('handles missing package.json gracefully (defaults to 0.0.0)', async () => {
    setupMonorepo()
    // Delete auth's package.json
    rmSync(join(dir, 'packages', 'auth', 'package.json'))
    execSync('git add . && git commit -m "feat(auth): orphan"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true, package: 'auth' })
    expect(results[0].currentVersion).toBe('0.0.0')
    expect(results[0].nextVersion).toBe('0.1.0')
  })

  // === History records package name ===

  it('history entry includes package name in version field', async () => {
    setupMonorepo()
    execSync('git commit --allow-empty -m "feat(auth): thing"', { cwd: dir })
    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false, package: 'auth' })

    const history = JSON.parse(readFileSync(join(dir, '.bumpcraft', 'history.json'), 'utf-8'))
    expect(history[0].version).toBe('auth@1.1.0')
    expect(history[0].previousVersion).toBe('auth@1.0.0')
  })
})
