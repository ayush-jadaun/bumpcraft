import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = process.cwd()
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-integration-'))
  execSync('git init -b main', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }))
  execSync('git add . && git commit -m "chore: initial commit"', { cwd: dir })
  execSync('git tag v1.0.0', { cwd: dir })
  writeFileSync(join(dir, '.bumpcraftrc.json'), JSON.stringify({
    versionSource: 'package.json',
    plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
    branches: { release: ['main', 'master'], preRelease: {} },
    commitTypes: { feat: 'minor', fix: 'patch' },
    policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null }
  }))
  execSync('git add . && git commit -m "feat: add dark mode"', { cwd: dir })
  process.chdir(dir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(dir, { recursive: true, force: true })
})

describe('Full release pipeline', () => {
  it('bumps minor version for feat commit', async () => {
    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })
    expect(result.bumpType).toBe('minor')
    expect(result.nextVersion).toBe('1.1.0')
  })

  it('generates markdown changelog', async () => {
    const { runRelease } = await import('../../src/index.js')
    const result = await runRelease({ dryRun: true })
    expect(result.changelogOutput).toContain('add dark mode')
    expect(result.changelogOutput).toContain('## 1.1.0')
  })
})
