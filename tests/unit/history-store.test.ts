import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HistoryStore } from '../../src/history/history-store.js'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir: string
let store: HistoryStore

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-test-'))
  store = new HistoryStore(join(dir, 'history.json'))
})

afterEach(() => rmSync(dir, { recursive: true }))

describe('HistoryStore', () => {
  it('returns empty array when no history', async () => {
    const entries = await store.getAll()
    expect(entries).toEqual([])
  })

  it('saves and retrieves an entry', async () => {
    await store.save({ version: '1.1.0', previousVersion: '1.0.0', date: '2026-03-17', commits: [], changelogOutput: '' })
    const entries = await store.getAll()
    expect(entries).toHaveLength(1)
    expect(entries[0].version).toBe('1.1.0')
  })

  it('filters by breaking changes', async () => {
    await store.save({ version: '2.0.0', previousVersion: '1.0.0', date: '2026-03-17', commits: [{ hash: 'a', type: 'feat', scope: null, subject: 'big change', body: null, breaking: true, raw: 'feat!: big change' }], changelogOutput: '' })
    await store.save({ version: '1.1.0', previousVersion: '1.0.0', date: '2026-03-16', commits: [{ hash: 'b', type: 'fix', scope: null, subject: 'small fix', body: null, breaking: false, raw: 'fix: small fix' }], changelogOutput: '' })
    const breaking = await store.query({ breaking: true })
    expect(breaking).toHaveLength(1)
    expect(breaking[0].version).toBe('2.0.0')
  })
})
