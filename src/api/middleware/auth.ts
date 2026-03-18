import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.BUMPCRAFT_API_KEY
  if (!apiKey) {
    res.status(401).json({ success: false, data: null, error: 'Authentication required' })
    return
  }
  const provided = req.headers['x-api-key']
  if (!provided) {
    res.status(401).json({ success: false, data: null, error: 'Authentication required' })
    return
  }
  if (provided !== apiKey) {
    res.status(403).json({ success: false, data: null, error: 'Invalid API key' })
    return
  }
  next()
}
