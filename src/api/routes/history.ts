import { Router } from 'express'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

export const historyRouter = Router()

historyRouter.get('/', async (req, res) => {
  const rawLast = req.query.last
  let last: number | undefined
  if (rawLast !== undefined) {
    const n = Number(rawLast)
    if (!Number.isInteger(n) || n <= 0) {
      return res.status(400).json({ success: false, data: null, error: 'last must be a positive integer' })
    }
    last = n
  }

  try {
    const store = new HistoryStore(join('.bumpcraft', 'history.json'))
    const entries = await store.query({
      breaking: req.query.breaking === 'true',
      scope: req.query.scope as string | undefined,
      type: req.query.type as string | undefined,
      since: req.query.since as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      last
    })
    res.json({ success: true, data: { entries }, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})
