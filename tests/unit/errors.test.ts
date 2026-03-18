import { describe, it, expect } from 'vitest'
import { BumpcraftError, ErrorCode } from '../../src/core/errors.js'

describe('BumpcraftError', () => {
  it('creates error with code and message', () => {
    const err = new BumpcraftError(ErrorCode.INVALID_VERSION, 'bad version')
    expect(err.code).toBe(ErrorCode.INVALID_VERSION)
    expect(err.message).toBe('bad version')
    expect(err instanceof Error).toBe(true)
  })

  it('attaches context when provided', () => {
    const ctx = { stage: 'parse', plugin: 'conventional-commits' }
    const err = new BumpcraftError(ErrorCode.PLUGIN_FAILED, 'plugin crashed', ctx)
    expect(err.context).toEqual(ctx)
  })
})
