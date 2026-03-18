import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'

export const releaseRouter = Router()

releaseRouter.post('/', authMiddleware, async (req, res) => {
  try {
    const { runRelease } = await import('../../index.js')
    const result = await runRelease({
      preRelease: req.body.preRelease,
      forceBump: req.body.forceBump,
      from: req.body.from,
      dryRun: false
    })
    res.json({ success: true, data: result, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})

releaseRouter.post('/dry-run', authMiddleware, async (req, res) => {
  try {
    const { runRelease } = await import('../../index.js')
    const result = await runRelease({
      preRelease: req.body.preRelease,
      forceBump: req.body.forceBump,
      from: req.body.from,
      dryRun: true
    })
    res.json({ success: true, data: result, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})
