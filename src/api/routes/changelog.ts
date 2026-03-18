import { Router } from 'express'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

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
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined
  })
  res.json({ success: true, data: { entries }, error: null })
})
