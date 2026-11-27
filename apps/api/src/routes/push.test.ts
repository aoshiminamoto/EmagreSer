import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../config.js'
import { pool, query } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import type { ReminderService } from '../jobs/reminders.js'
import { setReminderServiceForTests } from '../jobs/runtime.js'
import { buildServer } from '../server.js'

function fakeService(): ReminderService & {
  schedule: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
} {
  return {
    schedule: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    dispatch: vi.fn(async () => ({ sent: 0, skipped: 0, expired: 0 })),
  }
}

async function withServer(
  run: (app: FastifyInstance, service: ReturnType<typeof fakeService>) => Promise<void>,
) {
  const service = fakeService()
  setReminderServiceForTests(service)
  const app = await buildServer()
  try {
    await run(app, service)
  } finally {
    await app.close()
  }
}

async function register(app: FastifyInstance): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: 'push@example.com', password: 'Senha@123', consent: true },
  })
  expect(response.statusCode).toBe(201)
  return response.json().accessToken as string
}

function subscription(endpoint = 'https://push.example.com/sub-1') {
  return { endpoint, keys: { p256dh: 'p256dh-value', auth: 'auth-value' } }
}

beforeAll(async () => {
  await runMigrations()
}, 30000)

beforeEach(async () => {
  await query(`TRUNCATE users, user_settings, push_subscriptions RESTART IDENTITY CASCADE`)
})

afterAll(async () => {
  await pool.end()
})

describe('rotas de Web Push (RF-38)', () => {
  it('expõe a chave pública sem autenticação', async () => {
    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/push/public-key' })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ publicKey: config.vapidPublicKey })
    })
  })

  it('cadastra a inscrição e agenda o job', async () => {
    await withServer(async (app, service) => {
      const token = await register(app)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/push/subscribe',
        headers: { authorization: `Bearer ${token}` },
        payload: subscription(),
      })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ ok: true })
      expect(service.schedule).toHaveBeenCalledTimes(1)
      const { rows } = await query<{ endpoint: string; p256dh: string }>(
        `SELECT endpoint, p256dh FROM push_subscriptions`,
      )
      expect(rows).toEqual([{ endpoint: 'https://push.example.com/sub-1', p256dh: 'p256dh-value' }])
    })
  })

  it('recusa inscrição inválida e exige autenticação', async () => {
    await withServer(async (app) => {
      const anonymous = await app.inject({
        method: 'POST',
        url: '/api/v1/push/subscribe',
        payload: subscription(),
      })
      expect(anonymous.statusCode).toBe(401)

      const token = await register(app)
      const invalid = await app.inject({
        method: 'POST',
        url: '/api/v1/push/subscribe',
        headers: { authorization: `Bearer ${token}` },
        payload: { endpoint: 'http://inseguro.example.com', keys: { p256dh: 'x', auth: 'y' } },
      })
      expect(invalid.statusCode).toBe(400)
      expect(invalid.json()).toEqual({ error: 'VALIDATION_ERROR' })
    })
  })

  it('remove só o endpoint informado e cancela o job ao remover a última inscrição', async () => {
    await withServer(async (app, service) => {
      const token = await register(app)
      const headers = { authorization: `Bearer ${token}` }
      const endpoints = ['https://push.example.com/a', 'https://push.example.com/b']
      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/push/subscribe',
          headers,
          payload: subscription(endpoint),
        })
        expect(response.statusCode).toBe(200)
      }
      service.cancel.mockClear()

      const first = await app.inject({
        method: 'DELETE',
        url: '/api/v1/push/subscribe',
        headers,
        payload: { endpoint: endpoints[0] },
      })
      expect(first.statusCode).toBe(200)
      expect(service.cancel).not.toHaveBeenCalled()

      const second = await app.inject({
        method: 'DELETE',
        url: '/api/v1/push/subscribe',
        headers,
        payload: { endpoint: endpoints[1] },
      })
      expect(second.statusCode).toBe(200)
      expect(service.cancel).toHaveBeenCalledTimes(1)
      const { rows } = await query<{ id: string }>(`SELECT id FROM push_subscriptions`)
      expect(rows).toHaveLength(0)
    })
  })
})
