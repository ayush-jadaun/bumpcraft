import { describe, it, expect } from 'vitest'
import { loadConfig, defaultConfig } from '../../src/core/config.js'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig('/nonexistent/path/.bumpcraftrc.json')
    expect(config.versionSource).toBe('package.json')
    expect(config.plugins).toEqual([])
  })

  it('merges file config over defaults', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-test-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify({ versionSource: 'git-tag' }))
    const config = await loadConfig(configPath)
    expect(config.versionSource).toBe('git-tag')
    expect(config.branches).toEqual(defaultConfig.branches)
    unlinkSync(configPath)
  })

  it('throws on invalid config values', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-bad-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify({ versionSource: 123 }))
    await expect(loadConfig(configPath)).rejects.toThrow()
    unlinkSync(configPath)
  })

  it('throws on malformed JSON (not silently uses defaults)', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-malformed-${Date.now()}.json`)
    writeFileSync(configPath, '{ invalid json }')
    await expect(loadConfig(configPath)).rejects.toThrow(/config/)
    unlinkSync(configPath)
  })

  it('validates freezeAfter format', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-freeze-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify({
      policies: { freezeAfter: 'fryday 17:00' }
    }))
    await expect(loadConfig(configPath)).rejects.toThrow(/config/i)
    unlinkSync(configPath)
  })

  it('accepts valid freezeAfter', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-freeze-ok-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify({
      policies: { freezeAfter: 'friday 17:00' }
    }))
    const config = await loadConfig(configPath)
    expect(config.policies.freezeAfter).toBe('friday 17:00')
    unlinkSync(configPath)
  })
})
