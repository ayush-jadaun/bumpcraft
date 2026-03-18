import type { Request, Response, NextFunction } from 'express'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.BUMPCRAFT_API_KEY
  if (!apiKey) {
    res.status(403).json({
      success: false,
      data: null,
      error: 'BUMPCRAFT_API_KEY is not set. Set it to enable write endpoints.'
    })
    return
  }
  const provided = req.headers['x-api-key']
  if (provided !== apiKey) {
    res.status(403).json({ success: false, data: null, error: 'Invalid API key' })
    return
  }
  next()
}
