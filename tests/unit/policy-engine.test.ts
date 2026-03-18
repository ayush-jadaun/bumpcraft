import { describe, it, expect } from 'vitest'
import { PolicyEngine } from '../../src/policies/policy-engine.js'

describe('PolicyEngine', () => {
  it('allows release when no policies set', () => {
    const engine = new PolicyEngine({ requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null })
    expect(engine.check('minor')).toEqual({ allowed: true, reason: null })
  })

  it('blocks major release when requireApproval includes major', () => {
    const engine = new PolicyEngine({ requireApproval: ['major'], autoRelease: [], freezeAfter: null, maxBumpPerDay: null })
    const result = engine.check('major')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/requires approval/i)
  })

  it('blocks release after freeze time', () => {
    // Create a date that's a Friday at 18:00
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
})
