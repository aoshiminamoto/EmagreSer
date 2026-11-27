import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { config } from '../config.js'
import { pool, query } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { buildServer } from '../server.js'
import { sha256 } from '../services/crypto.js'

const flushClient = new Redis(config.redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
})

async function waitForReady(client: Redis): Promise<void> {
  const deadline = Date.now() + 5000
  while (client.status !== 'ready' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  if (client.status !== 'ready') throw new Error('Redis não ficou pronto para o teste')
}

async function withServer(run: (app: FastifyInstance) => Promise<void>): Promise<void> {
  const app = await buildServer()
  try {
    await waitForReady(app.redis)
    await run(app)
  } finally {
    await app.close()
  }
}

async function createUser(email: string, lastSeen: string | null): Promise<string> {
  const id = randomUUID()
  await query(
    `INSERT INTO users (id, email, password_hash, consent_at, last_seen_at)
     VALUES ($1, $2, 'hash', now(), ${lastSeen ?? 'NULL'})`,
    [id, email],
  )
  await query(
    `INSERT INTO user_settings (user_id, client_updated_at, change_seq)
     VALUES ($1, now(), nextval('change_seq'))`,
    [id],
  )
  return id
}

async function addWeight(userId: string, deleted = false): Promise<void> {
  await query(
    `INSERT INTO weight_entries
       (id, user_id, date, weight_kg, client_updated_at, change_seq, deleted_at)
     VALUES ($1, $2, '2026-11-20', 80.1, now(), nextval('change_seq'), $3)`,
    [randomUUID(), userId, deleted ? new Date().toISOString() : null],
  )
}

async function addHabitLog(userId: string, done: boolean, deleted = false): Promise<void> {
  const habitId = randomUUID()
  await query(
    `INSERT INTO habits (id, user_id, key, client_updated_at, change_seq, deleted_at)
     VALUES ($1, $2, $3, now(), nextval('change_seq'), NULL)`,
    [habitId, userId, `habito-${habitId}`],
  )
  await query(
    `INSERT INTO habit_logs
       (id, user_id, date, habit_id, done, client_updated_at, change_seq, deleted_at)
     VALUES ($1, $2, '2026-11-20', $3, $4, now(), nextval('change_seq'), $5)`,
    [randomUUID(), userId, habitId, done, deleted ? new Date().toISOString() : null],
  )
}

async function addWater(
  userId: string,
  glasses: number,
  deleted = false,
  date = '2026-11-20',
): Promise<void> {
  await query(
    `INSERT INTO water_logs (id, user_id, date, glasses, client_updated_at, change_seq, deleted_at)
     VALUES ($1, $2, $3, $4, now(), nextval('change_seq'), $5)`,
    [randomUUID(), userId, date, glasses, deleted ? new Date().toISOString() : null],
  )
}

const originalMinUsers = config.publicStatsMinUsers

beforeAll(async () => {
  await runMigrations()
}, 30000)

beforeEach(async () => {
  await query(
    `TRUNCATE users, refresh_tokens, password_reset_tokens, user_settings, weight_entries,
      milestones, habits, habit_logs, water_logs, push_subscriptions RESTART IDENTITY CASCADE`,
  )
  await query(`SELECT setval('change_seq', 1, false)`)
  if (flushClient.status === 'wait' || flushClient.status === 'end') await flushClient.connect()
  await waitForReady(flushClient)
  await flushClient.flushdb()
})

afterEach(() => {
  config.publicStatsMinUsers = originalMinUsers
})

afterAll(async () => {
  flushClient.disconnect()
  await pool.end()
})

describe('GET /public/stats (RF-71/RN-14)', () => {
  it('não envia números abaixo do mínimo de contas', async () => {
    config.publicStatsMinUsers = 50
    await createUser('um@example.com', 'now()')
    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/public/stats' })
      expect(response.statusCode).toBe(200)
      expect(response.headers['cache-control']).toBe('public, max-age=300')
      expect(response.json()).toEqual({ belowThreshold: true })
    })
  })

  it('devolve só totais anônimos, sem excluídos nem registros antigos', async () => {
    config.publicStatsMinUsers = 2
    const recent = await createUser('recente@example.com', 'now()')
    const old = await createUser('antigo@example.com', `now() - interval '40 days'`)
    await addWeight(recent)
    await addWeight(recent, true)
    await addHabitLog(recent, true)
    await addHabitLog(old, true, true)
    await addHabitLog(old, false)
    await addWater(recent, 3)
    await addWater(old, 5)
    await addWater(old, 100, true)

    await withServer(async (app) => {
      const response = await app.inject({ method: 'GET', url: '/public/stats' })
      expect(response.statusCode).toBe(200)
      const body = response.json() as Record<string, unknown>
      expect(body.activeUsers30d).toBe(1)
      expect(body.totalUsers).toBe(2)
      expect(body.weightEntries).toBe(1)
      expect(body.habitsCompleted).toBe(1)
      expect(body.waterGlasses).toBe(8)
      expect(Number.isNaN(Date.parse(String(body.updatedAt)))).toBe(false)
      expect(JSON.stringify(body)).not.toContain('recente@example.com')
      expect(body).not.toHaveProperty('weightKg')
      expect(await app.redis.ttl('public:stats')).toBeGreaterThan(0)
    })
  })

  it('mantém o resultado em cache por 15 minutos', async () => {
    config.publicStatsMinUsers = 2
    const user = await createUser('cache@example.com', 'now()')
    await createUser('cache2@example.com', 'now()')
    await addWater(user, 2)

    await withServer(async (app) => {
      const first = await app.inject({ method: 'GET', url: '/public/stats' })
      expect((first.json() as { waterGlasses: number }).waterGlasses).toBe(2)
      await addWater(user, 6, false, '2026-11-21')
      const second = await app.inject({ method: 'GET', url: '/public/stats' })
      expect((second.json() as { waterGlasses: number }).waterGlasses).toBe(2)
    })
  })

  it('limita requisições por IP', async () => {
    config.publicStatsMinUsers = 2
    await createUser('limite@example.com', 'now()')
    await createUser('limite2@example.com', 'now()')

    await withServer(async (app) => {
      const headers = { 'x-forwarded-for': '203.0.113.7' }
      for (let i = 0; i < 30; i += 1) {
        const response = await app.inject({ method: 'GET', url: '/public/stats', headers })
        expect(response.statusCode).toBe(200)
      }
      const blocked = await app.inject({ method: 'GET', url: '/public/stats', headers })
      expect(blocked.statusCode).toBe(429)
      expect(blocked.json()).toEqual({ error: 'RATE_LIMITED' })
      expect(await app.redis.get(`rl:public-stats:${sha256('203.0.113.7')}`)).toBe('31')
    })
  })
})
