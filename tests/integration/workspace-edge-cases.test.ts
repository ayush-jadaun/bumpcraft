import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

beforeEach(() => {
  vi.resetModules()
  originalCwd = process.cwd()
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-ws-edge-'))
  process.chdir(dir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(dir, { recursive: true, force: true })
})

function writeConfig(overrides: Record<string, unknown> = {}) {
  writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
    versionSource: 'package.json',
    commitTypes: { feat: 'minor', fix: 'patch' },
    policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null },
    ...overrides
  }))
}

describe('Workspace detection edge cases', () => {

  it('name collision: two packages named "memory" in different dirs', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    writeConfig()
    mkdirSync(join(dir, 'packages', 'cache-adapters', 'memory'), { recursive: true })
    mkdirSync(join(dir, 'packages', 'db-adapters', 'memory'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'cache-adapters', 'memory', 'package.json'), JSON.stringify({ name: '@t/cache-memory', version: '1.0.0' }))
    writeFileSync(join(dir, 'packages', 'db-adapters', 'memory', 'package.json'), JSON.stringify({ name: '@t/db-memory', version: '1.0.0' }))
    // pnpm-workspace.yaml with two globs
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/cache-adapters/*"\n  - "packages/db-adapters/*"\n')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    const keys = Object.keys(config.monorepo!)
    // Both should be detected with disambiguated names
    expect(keys.length).toBe(2)
    // One should be "memory", the other should be "db-adapters/memory" (or similar)
    const paths = Object.values(config.monorepo!).map(p => (p as {path: string}).path)
    expect(paths).toContain(join('packages', 'cache-adapters', 'memory'))
    expect(paths).toContain(join('packages', 'db-adapters', 'memory'))
  })

  it('pnpm-workspace.yaml with comments and empty lines', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    writeConfig()
    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@t/core', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), '# comment\npackages:\n  # another comment\n  - "packages/*"\n\n  # empty line above\n')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    expect(config.monorepo!['core']).toBeDefined()
  })

  it('pnpm-workspace.yaml with unquoted globs', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    writeConfig()
    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@t/core', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    expect(config.monorepo!['core']).toBeDefined()
  })

  it('both pnpm-workspace.yaml and package.json workspaces exist — package.json wins', async () => {
    mkdirSync(join(dir, 'npm-pkgs', 'alpha'), { recursive: true })
    mkdirSync(join(dir, 'pnpm-pkgs', 'beta'), { recursive: true })
    writeFileSync(join(dir, 'npm-pkgs', 'alpha', 'package.json'), JSON.stringify({ name: '@t/alpha', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-pkgs', 'beta', 'package.json'), JSON.stringify({ name: '@t/beta', version: '1.0.0' }))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true, workspaces: ['npm-pkgs/*'] }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "pnpm-pkgs/*"\n')
    writeConfig()

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    // package.json workspaces should win (checked first)
    expect(config.monorepo!['alpha']).toBeDefined()
    expect(config.monorepo!['beta']).toBeUndefined()
  })

  it('workspace glob matches zero directories — no monorepo detected', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '1.0.0' }))
    writeConfig()
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "nonexistent/*"\n')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).toBeNull()
  })

  it('package directory exists but has no package.json — skipped', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    writeConfig()
    mkdirSync(join(dir, 'packages', 'empty-dir'), { recursive: true })
    mkdirSync(join(dir, 'packages', 'valid'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'valid', 'package.json'), JSON.stringify({ name: '@t/valid', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    expect(config.monorepo!['valid']).toBeDefined()
    expect(config.monorepo!['empty-dir']).toBeUndefined()
  })

  it('explicit monorepo config overrides auto-detect', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    mkdirSync(join(dir, 'packages', 'auto'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'auto', 'package.json'), JSON.stringify({ name: '@t/auto', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n')
    writeConfig({ monorepo: { manual: { path: 'custom/path' } } })

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo!['manual']).toBeDefined()
    expect(config.monorepo!['auto']).toBeUndefined()
  })

  it('empty config file {} uses defaults with auto-detect', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', version: '0.0.0', private: true }))
    mkdirSync(join(dir, 'packages', 'core'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@t/core', version: '1.0.0' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n')
    writeFileSync(join(dir, '.bumpcraftrc.json'), '{}')

    const { loadConfig } = await import('../../src/core/config.js')
    const config = await loadConfig('.bumpcraftrc.json')
    expect(config.monorepo).not.toBeNull()
    expect(config.plugins).toHaveLength(2) // default plugins
  })
})
