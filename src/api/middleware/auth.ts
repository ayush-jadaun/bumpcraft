import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.BUMPCRAFT_API_KEY
  if (!apiKey) {
    res.status(401).json({ success: false, data: null, error: 'Authentication required' })
    return
  }
  const provided = req.headers['x-api-key']
  if (!provided || typeof provided !== 'string') {
    res.status(401).json({ success: false, data: null, error: 'Authentication required' })
    return
  }
  // Timing-safe comparison to prevent side-channel attacks
  const a = Buffer.from(provided)
  const b = Buffer.from(apiKey)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(403).json({ success: false, data: null, error: 'Invalid API key' })
    return
  }
  next()
}
