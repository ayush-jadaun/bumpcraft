import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
  it('returns 401', async () => {
    const res = await request(app)
      .post('/api/release')
      .send({ dryRun: true })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/release input validation', () => {
  const apiKey = 'test-key'

  beforeEach(() => { process.env.BUMPCRAFT_API_KEY = apiKey })
  afterEach(() => { delete process.env.BUMPCRAFT_API_KEY })

  it('returns 400 when forceBump is invalid', async () => {
    const res = await request(app)
      .post('/api/release')
      .set('X-API-Key', apiKey)
      .send({ forceBump: 'invalid' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/forceBump/i)
  })

  it('returns 400 when preRelease is not a string', async () => {
    const res = await request(app)
      .post('/api/release')
      .set('X-API-Key', apiKey)
      .send({ preRelease: 123 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/preRelease/i)
  })

  it('returns 400 when from is not a string', async () => {
    const res = await request(app)
      .post('/api/release')
      .set('X-API-Key', apiKey)
      .send({ from: true })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/from/i)
  })
})
