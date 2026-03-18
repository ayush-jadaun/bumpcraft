import { readFile, writeFile, mkdir, rename } from 'fs/promises'
import { dirname } from 'path'
import type { ParsedCommit } from '../pipeline/types.js'

export interface HistoryEntry {
  version: string
  previousVersion: string
  date: string
  commits: ParsedCommit[]
  changelogOutput: string
}

export interface HistoryQuery {
  breaking?: boolean
  scope?: string
  type?: string
  since?: string
  from?: string
  to?: string
  last?: number
}

export class HistoryStore {
  // Chain only — never hold a rejection; errors surface to caller but don't poison future saves
  private writeLock: Promise<void> = Promise.resolve()

  constructor(private readonly path: string) {}

  async getAll(): Promise<HistoryEntry[]> {
    try {
      const content = await readFile(this.path, 'utf-8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async save(entry: HistoryEntry): Promise<void> {
    const next = this.writeLock.then(() => this._doSave(entry))
    // Keep the chain alive even if this save fails — future saves must still run
    this.writeLock = next.catch(() => {})
    return next
  }

  private async _doSave(entry: HistoryEntry): Promise<void> {
    const entries = await this.getAll()
    entries.unshift(entry)
    await mkdir(dirname(this.path), { recursive: true })
    // Atomic write: tmp then rename prevents partial-write corruption on crash
    const tmp = `${this.path}.tmp`
    await writeFile(tmp, JSON.stringify(entries, null, 2), 'utf-8')
    await rename(tmp, this.path)
  }

  async query(q: HistoryQuery): Promise<HistoryEntry[]> {
    let entries = await this.getAll()

    // Apply `since` on the full list first so version lookups are accurate
    if (q.since) {
      const sinceIdx = entries.findIndex(e => e.version === q.since)
      if (sinceIdx === -1) return []
      entries = entries.slice(0, sinceIdx)
    }

    // Entries stored newest-first. "from" = older end, "to" = newer end.
    if (q.from || q.to) {
      const fromIdx = q.from ? entries.findIndex(e => e.version === q.from) : entries.length - 1
      const toIdx   = q.to   ? entries.findIndex(e => e.version === q.to)   : 0
      if ((q.from && fromIdx === -1) || (q.to && toIdx === -1)) return []
      entries = entries.slice(Math.min(toIdx, fromIdx), Math.max(toIdx, fromIdx) + 1)
    }

    if (q.breaking) {
      entries = entries.filter(e => e.commits.some(c => c.breaking))
    }

    if (q.scope) {
      entries = entries.filter(e => e.commits.some(c => c.scope === q.scope))
    }

    if (q.type) {
      entries = entries.filter(e => e.commits.some(c => c.type === q.type))
    }

    if (q.last) {
      entries = entries.slice(0, q.last)
    }

    return entries
  }
}
