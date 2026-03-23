import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runHook } from '../../src/core/hooks.js'
import { defaultConfig } from '../../src/core/config.js'
import { noopLogger } from '../../src/core/logger.js'
import { execSync } from 'child_process'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

const mockExecSync = vi.mocked(execSync)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Lifecycle Hooks', () => {
  it('runs a configured hook', () => {
    const config = { ...defaultConfig, hooks: { ...defaultConfig.hooks, beforeRelease: 'echo hello' } }
    runHook(config, 'beforeRelease', noopLogger)
    expect(mockExecSync).toHaveBeenCalledWith('echo hello', expect.objectContaining({ stdio: 'inherit' }))
  })

  it('does nothing when hook is not configured', () => {
    runHook(defaultConfig, 'beforeRelease', noopLogger)
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('passes environment variables to the hook', () => {
    const config = { ...defaultConfig, hooks: { ...defaultConfig.hooks, afterBump: 'echo $BUMPCRAFT_VERSION' } }
    runHook(config, 'afterBump', noopLogger, { BUMPCRAFT_VERSION: '1.2.0' })
    expect(mockExecSync).toHaveBeenCalledWith(
      'echo $BUMPCRAFT_VERSION',
      expect.objectContaining({
        env: expect.objectContaining({ BUMPCRAFT_VERSION: '1.2.0' })
      })
    )
  })

  it('throws when a hook command fails', () => {
    mockExecSync.mockImplementation(() => { throw new Error('exit code 1') })
    const config = { ...defaultConfig, hooks: { ...defaultConfig.hooks, beforeRelease: 'false' } }
    expect(() => runHook(config, 'beforeRelease', noopLogger)).toThrow(/hook.*failed/i)
  })

  it('does not run hooks for unconfigured hook names', () => {
    const config = { ...defaultConfig, hooks: { ...defaultConfig.hooks, beforeRelease: 'echo yes' } }
    runHook(config, 'afterRelease', noopLogger)
    expect(mockExecSync).not.toHaveBeenCalled()
  })
})
