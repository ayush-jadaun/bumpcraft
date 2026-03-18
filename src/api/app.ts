import express from 'express'
import { healthRouter } from './routes/health.js'
import { versionRouter } from './routes/version.js'
import { changelogRouter } from './routes/changelog.js'
import { releaseRouter } from './routes/release.js'
import { pluginsRouter } from './routes/plugins.js'
import { historyRouter } from './routes/history.js'
import { authMiddleware } from './middleware/auth.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createApp() {
  const app = express()
  app.use(express.json())

  // Apply auth to ALL routes when BUMPCRAFT_AUTH_ALL=true
  if (process.env.BUMPCRAFT_AUTH_ALL === 'true') {
    app.use(authMiddleware)
  }

  let dashboardHtml: string | null = null
  try {
    dashboardHtml = readFileSync(join(__dirname, '../dashboard/index.html'), 'utf-8')
  } catch { /* dashboard not built */ }

  app.get('/dashboard', (_req, res) => {
    if (!dashboardHtml) return res.status(404).send('Dashboard not found')
    res.send(dashboardHtml)
  })

  app.use('/api/health', healthRouter)
  app.use('/api/version', versionRouter)
  app.use('/api/changelog', changelogRouter)
  app.use('/api/release', releaseRouter)
  app.use('/api/plugins', pluginsRouter)
  app.use('/api/history', historyRouter)

  return app
}
