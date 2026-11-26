import { describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from './server.js'

async function withServer(run: (app: FastifyInstance) => Promise<void>): Promise<void> {
  const app = await buildServer()
  try {
    await run(app)
  } finally {
    await app.close()
  }
}

describe('API base', () => {
  it('GET /api/v1/health responde status ok', async () => {
    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/health' })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })
    })
  })

  it('CSP restritiva impede eval em scripts', async () => {
    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/health' })
      expect(response.headers['content-security-policy']).toContain("script-src 'self'")
      expect(response.headers['content-security-policy']).not.toContain("'unsafe-eval'")
    })
  })

  it('rota de API inexistente devolve JSON, não o index.html', async () => {
    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/inexistente' })
      expect(response.statusCode).toBe(404)
      expect(response.json()).toEqual({ error: 'NOT_FOUND' })
    })
  })
})
