import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { config } from '../config.js'
import { pool, query } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { buildServer } from '../server.js'

const flushClient = new Redis(config.redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
})

async function withServer(run: (app: FastifyInstance) => Promise<void>): Promise<void> {
  const app = await buildServer()
  try {
    await run(app)
  } finally {
    await app.close()
  }
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

function iso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString()
}

async function register(app: FastifyInstance, email = 'ana@example.com'): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: 'Senha@123', consent: true },
  })
  expect(response.statusCode).toBe(201)
  return response.json().accessToken as string
}

function weight(id: string, date: string, kg: number, minutes: number) {
  return {
    entity: 'weight_entries',
    id,
    op: 'upsert',
    data: { date, weight_kg: kg },
    clientUpdatedAt: iso(minutes),
  }
}

function push(app: FastifyInstance, token: string, changes: unknown[]) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/sync/push',
    headers: bearer(token),
    payload: { deviceId: 'aparelho-1', changes },
  })
}

function pull(app: FastifyInstance, token: string, cursor = 0, limit = 500) {
  return app.inject({
    method: 'GET',
    url: `/api/v1/sync/pull?cursor=${cursor}&limit=${limit}`,
    headers: bearer(token),
  })
}

async function userIdOf(email: string): Promise<string> {
  const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email])
  return rows[0].id
}

beforeAll(async () => {
  await runMigrations()
}, 30000)

beforeEach(async () => {
  await query(
    `TRUNCATE users, refresh_tokens, password_reset_tokens, user_settings, weight_entries,
      milestones, habits, habit_logs, water_logs, push_subscriptions RESTART IDENTITY CASCADE`,
  )
  await query(`UPDATE feature_flags SET state = 'off', rollout_percent = 0, tester_emails = '{}'`)
  await query(`SELECT setval('change_seq', 1, false)`)
  if (flushClient.status === 'end') await flushClient.connect().catch(() => {})
  await flushClient.flushdb().catch(() => {})
})

afterAll(async () => {
  flushClient.disconnect()
  await pool.end()
})

describe('sincronização', () => {
  it('aplica um lote offline uma única vez, mesmo repetido', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const changes = [
        weight(randomUUID(), '2026-11-20', 80.1, -30),
        weight(randomUUID(), '2026-11-21', 79.8, -29),
        weight(randomUUID(), '2026-11-22', 79.4, -28),
      ]
      const first = await push(app, token, changes)
      expect(first.statusCode).toBe(200)
      expect(first.json().applied).toHaveLength(3)
      expect(first.json().conflicts).toHaveLength(0)

      const repeated = await push(app, token, changes)
      expect(repeated.statusCode).toBe(200)
      expect(repeated.json().applied).toHaveLength(3)
      expect(
        repeated
          .json()
          .applied.every((item: { changeSeq: number | null }) => item.changeSeq === null),
      ).toBe(true)

      const stored = await query<{ id: string }>(`SELECT id FROM weight_entries`)
      expect(stored.rows).toHaveLength(3)
      const pulled = await pull(app, token)
      expect(
        pulled
          .json()
          .changes.filter((item: { entity: string }) => item.entity === 'weight_entries'),
      ).toHaveLength(3)
    })
  })

  it('resolve conflito pela escrita mais recente e limita o relógio a 5 minutos no futuro', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const id = randomUUID()
      await push(app, token, [weight(id, '2026-11-20', 70, -60)])
      await push(app, token, [weight(id, '2026-11-20', 71, -10)])

      const older = await push(app, token, [weight(id, '2026-11-20', 69, -120)])
      expect(older.json().conflicts).toMatchObject([{ reason: 'NEWER_EXISTS' }])

      const future = await push(app, token, [weight(id, '2026-11-20', 72, 30)])
      expect(future.statusCode).toBe(200)
      const row = await query<{ weight_kg: string; client_updated_at: Date }>(
        `SELECT weight_kg, client_updated_at FROM weight_entries WHERE id = $1`,
        [id],
      )
      expect(Number(row.rows[0].weight_kg)).toBe(72)
      expect(row.rows[0].client_updated_at.getTime()).toBeLessThanOrEqual(
        Date.now() + 5 * 60_000 + 2000,
      )
    })
  })

  it('mantém o peso mais recente quando dois aparelhos criam a mesma data', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const olderId = randomUUID()
      const newerId = randomUUID()
      await push(app, token, [weight(olderId, '2026-11-23', 80, -60)])
      await push(app, token, [weight(newerId, '2026-11-23', 79.5, -10)])

      const live = await query<{ id: string }>(
        `SELECT id FROM weight_entries WHERE date = '2026-11-23' AND deleted_at IS NULL`,
      )
      expect(live.rows).toHaveLength(1)
      expect(live.rows[0].id).toBe(newerId)

      const pulled = await pull(app, token)
      const changes = pulled.json().changes as { id: string; op: string }[]
      expect(changes.find((item) => item.id === olderId)?.op).toBe('delete')
      expect(changes.find((item) => item.id === newerId)?.op).toBe('upsert')
    })
  })

  it('sincroniza tombstone e permite que um upsert mais novo o desfaça', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const id = randomUUID()
      await push(app, token, [weight(id, '2026-11-24', 78, -60)])
      await push(app, token, [
        { entity: 'weight_entries', id, op: 'delete', data: {}, clientUpdatedAt: iso(-30) },
      ])
      const deleted = await pull(app, token)
      expect(
        (deleted.json().changes as { id: string; op: string }[]).find((item) => item.id === id)?.op,
      ).toBe('delete')

      await push(app, token, [weight(id, '2026-11-24', 77.5, -10)])
      const restored = await query<{ deleted_at: Date | null }>(
        `SELECT deleted_at FROM weight_entries WHERE id = $1`,
        [id],
      )
      expect(restored.rows[0].deleted_at).toBeNull()
    })
  })

  it('pagina o pull por cursor com hasMore', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      for (let day = 1; day <= 5; day += 1) {
        await push(app, token, [
          weight(randomUUID(), `2026-11-${String(day).padStart(2, '0')}`, 80, -20),
        ])
      }
      const first = await pull(app, token, 0, 2)
      expect(first.json().changes).toHaveLength(2)
      expect(first.json().hasMore).toBe(true)

      const second = await pull(app, token, first.json().nextCursor, 2)
      expect(second.json().changes).toHaveLength(2)
      expect(second.json().hasMore).toBe(true)

      const last = await pull(app, token, second.json().nextCursor, 2)
      expect(last.json().changes).toHaveLength(2)
      expect(last.json().hasMore).toBe(false)
    })
  })

  it('rejeita lote acima de 200 alterações e atualiza last_seen_at no push', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const many = Array.from({ length: 201 }, () => weight(randomUUID(), '2026-11-25', 80, -10))
      expect((await push(app, token, many)).statusCode).toBe(400)

      await push(app, token, [weight(randomUUID(), '2026-11-25', 80, -10)])
      const seen = await query<{ last_seen_at: Date | null }>(`SELECT last_seen_at FROM users`)
      expect(seen.rows[0].last_seen_at).not.toBeNull()
    })
  })

  it('impede que um usuário altere ou veja dados de outro', async () => {
    await withServer(async (app) => {
      const ana = await register(app)
      const bruno = await register(app, 'bruno@example.com')
      const brunoId = await userIdOf('bruno@example.com')
      const foreignId = randomUUID()
      await push(app, bruno, [weight(foreignId, '2026-11-26', 99.9, -10)])

      const attempt = await push(app, ana, [weight(foreignId, '2026-11-26', 50, 0)])
      expect(attempt.json().conflicts).toMatchObject([{ reason: 'FOREIGN_ENTITY' }])
      const stored = await query<{ weight_kg: string }>(
        `SELECT weight_kg FROM weight_entries WHERE id = $1`,
        [foreignId],
      )
      expect(Number(stored.rows[0].weight_kg)).toBe(99.9)

      const settings = await push(app, ana, [
        {
          entity: 'settings',
          id: brunoId,
          op: 'upsert',
          data: { onboarding_done: true },
          clientUpdatedAt: iso(1),
        },
      ])
      expect(settings.json().conflicts).toHaveLength(0)
      const anaSettings = await query<{ onboarding_done: boolean }>(
        `SELECT onboarding_done FROM user_settings WHERE user_id = $1`,
        [await userIdOf('ana@example.com')],
      )
      const brunoSettings = await query<{ onboarding_done: boolean }>(
        `SELECT onboarding_done FROM user_settings WHERE user_id = $1`,
        [brunoId],
      )
      expect(anaSettings.rows[0].onboarding_done).toBe(true)
      expect(brunoSettings.rows[0].onboarding_done).toBe(false)

      const pulled = await pull(app, ana)
      expect(JSON.stringify(pulled.json())).not.toContain(foreignId)
    })
  })
})

describe('feature flags', () => {
  it('avalia os quatro estados sem expor testadores nem porcentagem', async () => {
    await withServer(async (app) => {
      const token = await register(app)
      const anonymous = await app.inject({ method: 'GET', url: '/api/v1/flags' })
      expect(anonymous.json()).toMatchObject({
        flags: { i18n_en: false, i18n_es: false },
        locales: ['pt-BR'],
      })
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/flags', headers: bearer(token) })).json()
          .flags.i18n_en,
      ).toBe(false)

      await query(
        `UPDATE feature_flags SET state = 'testers', tester_emails = $1 WHERE key = 'i18n_en'`,
        [['ana@example.com']],
      )
      await flushClient.flushdb()
      const tester = await app.inject({
        method: 'GET',
        url: '/api/v1/flags',
        headers: bearer(token),
      })
      expect(tester.json().flags.i18n_en).toBe(true)
      expect(tester.json().locales).toEqual(['pt-BR', 'en-US'])
      expect(JSON.stringify(tester.json())).not.toContain('ana@example.com')
      expect(JSON.stringify(tester.json())).not.toContain('rollout')
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        false,
      )

      await query(
        `UPDATE feature_flags SET state = 'percent', rollout_percent = 0 WHERE key = 'i18n_en'`,
      )
      await flushClient.flushdb()
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/flags', headers: bearer(token) })).json()
          .flags.i18n_en,
      ).toBe(true)

      await query(
        `UPDATE feature_flags SET state = 'percent', rollout_percent = 0, tester_emails = '{}' WHERE key = 'i18n_en'`,
      )
      await flushClient.flushdb()
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/flags', headers: bearer(token) })).json()
          .flags.i18n_en,
      ).toBe(false)
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        false,
      )

      await query(
        `UPDATE feature_flags SET state = 'percent', rollout_percent = 100 WHERE key = 'i18n_en'`,
      )
      await flushClient.flushdb()
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/flags',
          headers: bearer(token),
        })
        expect(response.json().flags.i18n_en).toBe(true)
      }
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        false,
      )

      await query(`UPDATE feature_flags SET state = 'on' WHERE key = 'i18n_es'`)
      await flushClient.flushdb()
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().locales).toEqual([
        'pt-BR',
        'es-419',
      ])
    })
  })

  it('usa o cache do Redis e o invalida quando a chave é removida', async () => {
    await withServer(async (app) => {
      await query(`UPDATE feature_flags SET state = 'on' WHERE key = 'i18n_en'`)
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        true,
      )
      await query(`UPDATE feature_flags SET state = 'off' WHERE key = 'i18n_en'`)
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        true,
      )
      await flushClient.flushdb()
      expect((await app.inject({ method: 'GET', url: '/api/v1/flags' })).json().flags.i18n_en).toBe(
        false,
      )
    })
  })
})

describe('exportação e exclusão', () => {
  it('exporta em JSON só os dados do usuário e em CSV com cabeçalhos no idioma ativo', async () => {
    await withServer(async (app) => {
      const ana = await register(app)
      const bruno = await register(app, 'bruno@example.com')
      const anaId = await userIdOf('ana@example.com')
      await push(app, ana, [weight(randomUUID(), '2026-11-26', 72.5, -10)])
      await push(app, bruno, [weight(randomUUID(), '2026-11-26', 99.9, -10)])
      await query(`UPDATE user_settings SET locale = 'en-US' WHERE user_id = $1`, [anaId])
      await query(`UPDATE feature_flags SET state = 'on' WHERE key = 'i18n_en'`)

      const json = await app.inject({
        method: 'GET',
        url: '/api/v1/me/export',
        headers: bearer(ana),
      })
      expect(json.statusCode).toBe(200)
      expect(json.json().user.email).toBe('ana@example.com')
      expect(json.json().weightEntries[0].weight_kg).toBe(72.5)
      expect(json.json().weightEntries[0].date).toBe('2026-11-26')
      expect(JSON.stringify(json.json())).not.toContain('99.9')

      const csv = await app.inject({
        method: 'GET',
        url: '/api/v1/me/export?format=csv',
        headers: bearer(ana),
      })
      expect(csv.statusCode).toBe(200)
      expect(csv.headers['content-type']).toContain('text/csv')
      expect(csv.body.split('\r\n')[0]).toContain('Weight (kg)')
      expect(csv.body).toContain('72.5')
      expect(csv.body).not.toContain('99.9')
    })
  })

  it('exige senha e confirmação e apaga todas as linhas do usuário', async () => {
    await withServer(async (app) => {
      const ana = await register(app)
      await register(app, 'bruno@example.com')
      const anaId = await userIdOf('ana@example.com')
      const id = randomUUID()
      await push(app, ana, [weight(id, '2026-11-26', 72.5, -10)])
      await query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES ($1, $2, 'chave', 'segredo')`,
        [anaId, 'https://push.example.com/ana'],
      )

      expect(
        (
          await app.inject({
            method: 'DELETE',
            url: '/api/v1/me',
            headers: bearer(ana),
            payload: { password: 'Errada@123', confirm: true },
          })
        ).statusCode,
      ).toBe(401)
      expect(
        (
          await app.inject({
            method: 'DELETE',
            url: '/api/v1/me',
            headers: bearer(ana),
            payload: { password: 'Senha@123' },
          })
        ).statusCode,
      ).toBe(400)

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/me',
        headers: bearer(ana),
        payload: { password: 'Senha@123', confirm: true },
      })
      expect(response.statusCode).toBe(200)

      const deletedUsers = await query<{ total: string }>(
        `SELECT count(*)::text AS total FROM users WHERE id = $1`,
        [anaId],
      )
      expect(Number(deletedUsers.rows[0].total)).toBe(0)
      for (const table of [
        'user_settings',
        'weight_entries',
        'habit_logs',
        'habits',
        'water_logs',
        'milestones',
        'refresh_tokens',
        'push_subscriptions',
        'password_reset_tokens',
      ]) {
        const remaining = await query<{ total: string }>(
          `SELECT count(*)::text AS total FROM ${table} WHERE user_id = $1`,
          [anaId],
        )
        expect(Number(remaining.rows[0].total)).toBe(0)
      }
      expect((await query(`SELECT 1 FROM users`)).rows).toHaveLength(1)
      expect((await query(`SELECT 1 FROM weight_entries WHERE id = $1`, [id])).rows).toHaveLength(0)
    })
  })
})
