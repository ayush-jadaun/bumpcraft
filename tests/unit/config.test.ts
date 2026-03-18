import { describe, it, expect } from 'vitest'
import { loadConfig, defaultConfig } from '../../src/core/config.js'
import { writeFileSync } from 'fs'
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
  })

  it('throws on invalid config', async () => {
    const configPath = join(tmpdir(), `.bumpcraftrc-bad-${Date.now()}.json`)
    writeFileSync(configPath, JSON.stringify({ versionSource: 123 }))
    await expect(loadConfig(configPath)).rejects.toThrow()
  })
})
