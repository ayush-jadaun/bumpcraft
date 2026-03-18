import { Router } from 'express'
import { loadConfig } from '../../core/config.js'

export const pluginsRouter = Router()
pluginsRouter.get('/', async (_req, res) => {
  try {
    const config = await loadConfig('.bumpcraftrc.json')
    const plugins = config.plugins.map(p => (Array.isArray(p) ? p[0] : p))
    res.json({ success: true, data: { plugins }, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})
