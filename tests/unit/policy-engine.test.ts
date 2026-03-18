import { describe, it, expect } from 'vitest'
import { PolicyEngine } from '../../src/policies/policy-engine.js'

describe('PolicyEngine', () => {
  it('allows release when no policies set', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null })
    expect(engine.check('minor')).toEqual({ allowed: true, reason: null, requiresConfirmation: false })
  })

  it('blocks major release when requireApproval includes major', () => {
    const engine = new PolicyEngine({ requireApproval: ['major'], autoRelease: [], freezeAfter: null, maxBumpPerDay: null })
    const result = engine.check('major')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/requires approval/i)
  })

  it('blocks release after freeze time on freeze day', () => {
    const friday = new Date('2026-03-20T18:00:00')
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: 'friday 17:00', maxBumpPerDay: null, freezeTestDate: friday })
    const result = engine.check('patch')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/freeze/i)
  })

  it('allows release before freeze time', () => {
    const friday = new Date('2026-03-20T14:00:00')
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: 'friday 17:00', maxBumpPerDay: null, freezeTestDate: friday })
    const result = engine.check('patch')
    expect(result.allowed).toBe(true)
  })

  it('blocks release on Saturday after friday freeze', () => {
    const saturday = new Date('2026-03-21T10:00:00') // day after Friday
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: 'friday 17:00', maxBumpPerDay: null, freezeTestDate: saturday })
    const result = engine.check('patch')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/freeze/i)
  })

  it('blocks release on Sunday after friday freeze', () => {
    const sunday = new Date('2026-03-22T10:00:00') // 2 days after Friday
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: 'friday 17:00', maxBumpPerDay: null, freezeTestDate: sunday })
    const result = engine.check('patch')
    expect(result.allowed).toBe(false)
  })

  it('allows release on Monday after friday freeze', () => {
    const monday = new Date('2026-03-23T09:00:00') // 3 days after Friday
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: 'friday 17:00', maxBumpPerDay: null, freezeTestDate: monday })
    const result = engine.check('patch')
    expect(result.allowed).toBe(true)
  })

  it('blocks release when maxBumpPerDay is reached', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: null, maxBumpPerDay: 3 })
    const result = engine.check('patch', 3)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/max releases/i)
  })

  it('allows release when below maxBumpPerDay', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: null, maxBumpPerDay: 3 })
    const result = engine.check('patch', 2)
    expect(result.allowed).toBe(true)
  })

  it('maxBumpPerDay defaults to 0 when not provided', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: [], freezeAfter: null, maxBumpPerDay: null })
    const result = engine.check('patch')
    expect(result.allowed).toBe(true)
  })

  it('requiresConfirmation is true when bumpType not in autoRelease', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: ['patch'], freezeAfter: null, maxBumpPerDay: null })
    const result = engine.check('minor')
    expect(result.allowed).toBe(true)
    expect(result.requiresConfirmation).toBe(true)
  })

  it('requiresConfirmation is false when bumpType is in autoRelease', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: ['patch', 'minor'], freezeAfter: null, maxBumpPerDay: null })
    const result = engine.check('minor')
    expect(result.allowed).toBe(true)
    expect(result.requiresConfirmation).toBe(false)
  })
})
