import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/api/app.js'

const app = createApp()

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
  })
})

describe('POST /api/release without API key', () => {
  it('returns 403', async () => {
    const res = await request(app)
      .post('/api/release')
      .send({ dryRun: true })
    expect(res.status).toBe(403)
  })
})
