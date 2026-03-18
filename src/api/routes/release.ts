import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'

const VALID_BUMP_TYPES = ['major', 'minor', 'patch']

function validateReleaseBody(body: Record<string, unknown>): string | null {
  if (body.preRelease !== undefined && typeof body.preRelease !== 'string') {
    return 'preRelease must be a string'
  }
  if (body.forceBump !== undefined && !VALID_BUMP_TYPES.includes(body.forceBump as string)) {
    return 'forceBump must be one of: major, minor, patch'
  }
  if (body.from !== undefined && typeof body.from !== 'string') {
    return 'from must be a string'
  }
  return null
}

export const releaseRouter = Router()

releaseRouter.post('/', authMiddleware, async (req, res) => {
  const validationError = validateReleaseBody(req.body ?? {})
  if (validationError) {
    return res.status(400).json({ success: false, data: null, error: validationError })
  }
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
  const validationError = validateReleaseBody(req.body ?? {})
  if (validationError) {
    return res.status(400).json({ success: false, data: null, error: validationError })
  }
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
