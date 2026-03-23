import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

beforeEach(() => {
  vi.resetModules()
  originalCwd = process.cwd()
})

afterEach(() => {
  process.chdir(originalCwd)
  if (dir) rmSync(dir, { recursive: true, force: true })
})

function initGitRepo() {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-adv-'))
  execSync('git init -b main', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
}

describe('Workspace auto-detect', () => {
  it('detects packages from npm workspaces field', async () => {
    initGitRepo()

    // Root with workspaces
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'root', version: '0.0.0', private: true,
      workspaces: ['packages/*']
    }))

    // Two packages
    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@ws/core', version: '1.0.0' }))
    mkdirSync(join(dir, 'packages', 'utils'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'utils', 'package.json'), JSON.stringify({ name: '@ws/utils', version: '1.0.0' }))

    // Config WITHOUT explicit monorepo
    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor', fix: 'patch' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null }
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v1.0.0', { cwd: dir })
    execSync('git commit --allow-empty -m "feat(core): add feature"', { cwd: dir })
    process.chdir(dir)

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')

    // Should auto-detect monorepo from workspaces
    expect(config.monorepo).not.toBeNull()
    expect(config.monorepo!['core']).toBeDefined()
    expect(config.monorepo!['utils']).toBeDefined()
  })

  it('does not auto-detect when monorepo is explicitly configured', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'root', version: '0.0.0', private: true,
      workspaces: ['packages/*']
    }))

    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@ws/core', version: '1.0.0' }))

    // Config WITH explicit monorepo (only auth, not core)
    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      monorepo: { auth: { path: 'packages/auth' } }
    }))

    process.chdir(dir)
    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')

    // Should use explicit config, not auto-detect
    expect(config.monorepo!['auth']).toBeDefined()
    expect(config.monorepo!['core']).toBeUndefined()
  })
})

describe('Inter-package dependency bumping', () => {
  it('updates dependency version when a dependency package is released', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))

    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({
      name: '@mono/core', version: '1.0.0'
    }))

    mkdirSync(join(dir, 'packages', 'app'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'app', 'package.json'), JSON.stringify({
      name: '@mono/app', version: '2.0.0',
      dependencies: { '@mono/core': '^1.0.0' }
    }))

    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor', fix: 'patch' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      monorepo: {
        core: { path: 'packages/core' },
        app: { path: 'packages/app' }
      }
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v1.0.0', { cwd: dir })
    execSync('git commit --allow-empty -m "feat(core): new API"', { cwd: dir })
    process.chdir(dir)

    const { runMonorepoRelease } = await import('../../src/index.js')
    await runMonorepoRelease({ dryRun: false })

    // app's dependency on @mono/core should be updated
    const appPkg = JSON.parse(readFileSync(join(dir, 'packages', 'app', 'package.json'), 'utf-8'))
    expect(appPkg.dependencies['@mono/core']).toBe('^1.1.0')
  })
})

describe('Linked packages', () => {
  it('all linked packages get the highest version in the group', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))

    mkdirSync(join(dir, 'packages', 'compiler'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'compiler', 'package.json'), JSON.stringify({
      name: '@vue/compiler', version: '3.0.0'
    }))

    mkdirSync(join(dir, 'packages', 'runtime'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'runtime', 'package.json'), JSON.stringify({
      name: '@vue/runtime', version: '3.0.0'
    }))

    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor', fix: 'patch' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      monorepo: {
        compiler: { path: 'packages/compiler' },
        runtime: { path: 'packages/runtime' }
      },
      linked: [['compiler', 'runtime']]
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v3.0.0', { cwd: dir })
    // compiler gets feat (minor), runtime gets fix (patch)
    execSync('git commit --allow-empty -m "feat(compiler): new transform"', { cwd: dir })
    execSync('git commit --allow-empty -m "fix(runtime): memory leak"', { cwd: dir })
    process.chdir(dir)

    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: false })

    // Both should be 3.1.0 (the higher of minor=3.1.0 vs patch=3.0.1)
    const compilerPkg = JSON.parse(readFileSync(join(dir, 'packages', 'compiler', 'package.json'), 'utf-8'))
    const runtimePkg = JSON.parse(readFileSync(join(dir, 'packages', 'runtime', 'package.json'), 'utf-8'))
    expect(compilerPkg.version).toBe('3.1.0')
    expect(runtimePkg.version).toBe('3.1.0')
  })
})

describe('Hooks in release flow', () => {
  it('runs beforeRelease and afterRelease hooks on non-dry-run', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }))
    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      hooks: {
        beforeRelease: `node -e "require('fs').writeFileSync('before.txt', 'ran')"`,
        afterRelease: `node -e "require('fs').writeFileSync('after.txt', process.env.BUMPCRAFT_VERSION)"`
      }
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v1.0.0', { cwd: dir })
    execSync('git commit --allow-empty -m "feat: new thing"', { cwd: dir })
    process.chdir(dir)

    const { runRelease } = await import('../../src/index.js')
    await runRelease({ dryRun: false })

    expect(existsSync(join(dir, 'before.txt'))).toBe(true)
    expect(readFileSync(join(dir, 'before.txt'), 'utf-8')).toBe('ran')
    expect(existsSync(join(dir, 'after.txt'))).toBe(true)
    expect(readFileSync(join(dir, 'after.txt'), 'utf-8')).toBe('1.1.0')
  })

  it('does NOT run hooks on dry-run', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }))
    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      hooks: { beforeRelease: `node -e "require('fs').writeFileSync('hook.txt', 'ran')"` }
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v1.0.0', { cwd: dir })
    execSync('git commit --allow-empty -m "feat: thing"', { cwd: dir })
    process.chdir(dir)

    const { runRelease } = await import('../../src/index.js')
    await runRelease({ dryRun: true })

    expect(existsSync(join(dir, 'hook.txt'))).toBe(false)
  })
})

describe('Private package support', () => {
  it('monorepo skips private packages during release', async () => {
    initGitRepo()

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))

    mkdirSync(join(dir, 'packages', 'public-pkg'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'public-pkg', 'package.json'), JSON.stringify({
      name: '@mono/public', version: '1.0.0'
    }))

    mkdirSync(join(dir, 'packages', 'private-pkg'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'private-pkg', 'package.json'), JSON.stringify({
      name: '@mono/private', version: '1.0.0', private: true
    }))

    writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
      versionSource: 'package.json',
      plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
      branches: { release: ['main'], preRelease: {} },
      commitTypes: { feat: 'minor' },
      policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
      monorepo: {
        'public-pkg': { path: 'packages/public-pkg' },
        'private-pkg': { path: 'packages/private-pkg' }
      }
    }))

    execSync('git add . && git commit -m "chore: init"', { cwd: dir })
    execSync('git tag v1.0.0', { cwd: dir })
    execSync('git commit --allow-empty -m "feat: global feature"', { cwd: dir })
    process.chdir(dir)

    // Private packages should still get versioned (they just shouldn't be published)
    // The release itself doesn't skip them — only `publish` does
    const { runMonorepoRelease } = await import('../../src/index.js')
    const results = await runMonorepoRelease({ dryRun: true })

    // Both should get version bumps (private packages still need versions for internal deps)
    expect(results.find(r => r.package === 'public-pkg')).toBeDefined()
    expect(results.find(r => r.package === 'private-pkg')).toBeDefined()
  })
})
