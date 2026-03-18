import { Router } from 'express'
import { createVersionSource } from '../../core/version-source.js'
import { loadConfig } from '../../core/config.js'

export const versionRouter = Router()
versionRouter.get('/', async (_req, res) => {
  try {
    const config = await loadConfig('.bumpcraftrc.json')
    const source = createVersionSource(config.versionSource)
    const version = await source.read()
    res.json({ success: true, data: { version: version.toString() }, error: null })
  } catch (e) {
    res.status(500).json({ success: false, data: null, error: String(e) })
  }
})
