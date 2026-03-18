import { Router } from 'express'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

function queryString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined
}

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
      scope: queryString(req.query.scope),
      type: queryString(req.query.type),
      since: queryString(req.query.since),
      from: queryString(req.query.from),
      to: queryString(req.query.to),
      last
    })
    res.json({ success: true, data: { entries }, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})
