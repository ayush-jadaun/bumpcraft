import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HistoryStore } from '../../src/history/history-store.js'
import { mkdtempSync, rmSync } from 'fs'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir: string
let store: HistoryStore

const makeEntry = (version: string, previousVersion: string, breaking = false) => ({
  version,
  previousVersion,
  date: '2026-03-17',
  commits: breaking
    ? [{ hash: 'a', type: 'feat', scope: null, subject: 'big change', body: null, breaking: true, raw: 'feat!: big change' }]
    : [{ hash: 'b', type: 'fix', scope: null, subject: 'small fix', body: null, breaking: false, raw: 'fix: small fix' }],
  changelogOutput: ''
})

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-test-'))
  store = new HistoryStore(join(dir, 'history.json'))
})

afterEach(() => rmSync(dir, { recursive: true }))

describe('HistoryStore', () => {
  it('returns empty array when no history', async () => {
    expect(await store.getAll()).toEqual([])
  })

  it('returns empty array when history file contains non-array JSON', async () => {
    writeFileSync(join(dir, 'history.json'), 'null')
    expect(await store.getAll()).toEqual([])
  })

  it('saves and retrieves an entry', async () => {
    await store.save(makeEntry('1.1.0', '1.0.0'))
    const entries = await store.getAll()
    expect(entries).toHaveLength(1)
    expect(entries[0].version).toBe('1.1.0')
  })

  it('concurrent saves both complete without corruption', async () => {
    // Both saves must complete and both entries must be present
    await Promise.all([
      store.save(makeEntry('1.1.0', '1.0.0')),
      store.save(makeEntry('1.2.0', '1.1.0'))
    ])
    const entries = await store.getAll()
    expect(entries).toHaveLength(2)
  })

  describe('query', () => {
    beforeEach(async () => {
      // Save in chronological (oldest→newest) order so the file ends up newest-first
      // after each unshift: final order = [3.0.0, 2.1.0, 2.0.0, 1.1.0]
      await store.save(makeEntry('1.1.0', '1.0.0', false))
      await store.save(makeEntry('2.0.0', '1.0.0', false))
      await store.save(makeEntry('2.1.0', '2.0.0', false))
      await store.save(makeEntry('3.0.0', '2.0.0', true))   // breaking, newest
    })

    it('filters by breaking changes', async () => {
      const results = await store.query({ breaking: true })
      expect(results).toHaveLength(1)
      expect(results[0].version).toBe('3.0.0')
    })

    it('since: returns entries newer than the given version', async () => {
      const results = await store.query({ since: '2.0.0' })
      expect(results.map(e => e.version)).toEqual(['3.0.0', '2.1.0'])
    })

    it('since: returns empty array when version not found', async () => {
      expect(await store.query({ since: '9.9.9' })).toEqual([])
    })

    it('from/to: returns entries in version range', async () => {
      const results = await store.query({ from: '1.1.0', to: '2.1.0' })
      const versions = results.map(e => e.version)
      expect(versions).toContain('2.1.0')
      expect(versions).toContain('2.0.0')
      expect(versions).toContain('1.1.0')
      expect(versions).not.toContain('3.0.0')
    })

    it('from/to: returns empty when version not found', async () => {
      expect(await store.query({ from: '9.9.9' })).toEqual([])
      expect(await store.query({ to: '9.9.9' })).toEqual([])
    })

    it('last: returns only the N most recent entries', async () => {
      const results = await store.query({ last: 2 })
      expect(results).toHaveLength(2)
      expect(results[0].version).toBe('3.0.0')
    })

    it('since + breaking can be combined', async () => {
      const results = await store.query({ since: '2.0.0', breaking: true })
      expect(results.map(e => e.version)).toEqual(['3.0.0'])
    })
  })
})
