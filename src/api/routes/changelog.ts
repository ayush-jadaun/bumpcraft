import { Router } from 'express'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

function queryString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined
}

export const changelogRouter = Router()

changelogRouter.get('/latest', async (_req, res) => {
  const store = new HistoryStore(join('.bumpcraft', 'history.json'))
  const entries = await store.getAll()
  if (!entries.length) {
    res.json({ success: true, data: null, error: null })
    return
  }
  res.json({ success: true, data: entries[0], error: null })
})

changelogRouter.get('/', async (req, res) => {
  const store = new HistoryStore(join('.bumpcraft', 'history.json'))
  const entries = await store.query({
    from: queryString(req.query.from),
    to: queryString(req.query.to)
  })
  res.json({ success: true, data: { entries }, error: null })
})
