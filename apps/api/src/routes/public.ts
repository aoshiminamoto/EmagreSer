/**
 * RF-71/RN-14: totais anônimos para a landing de desktop. Sem login, sem
 * parâmetros, sem dado individual e sem valor de peso — apenas contagens.
 */
import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { query } from '../db/pool.js'
import { countAndAllow } from '../plugins/rate-limit.js'
import { withRedis } from '../plugins/redis.js'
import { sha256 } from '../services/crypto.js'

const CACHE_KEY = 'public:stats'
const CACHE_SECONDS = 15 * 60
const RATE_LIMIT = 30
const RATE_WINDOW_SECONDS = 60

interface CountRow {
  active_users_30d: string
  total_users: string
  weight_entries: string
  habits_completed: string
  water_glasses: string
}

type StatsResponse =
  | {
      activeUsers30d: number
      totalUsers: number
      weightEntries: number
      habitsCompleted: number
      waterGlasses: number
      updatedAt: string
    }
  | { belowThreshold: true }

async function computeStats(): Promise<StatsResponse> {
  const { rows } = await query<CountRow>(`
    SELECT
      (SELECT count(*) FROM users
        WHERE last_seen_at >= now() - interval '30 days') AS active_users_30d,
      (SELECT count(*) FROM users) AS total_users,
      (SELECT count(*) FROM weight_entries WHERE deleted_at IS NULL) AS weight_entries,
      (SELECT count(*) FROM habit_logs
        WHERE deleted_at IS NULL AND done = true) AS habits_completed,
      (SELECT coalesce(sum(glasses), 0) FROM water_logs
        WHERE deleted_at IS NULL) AS water_glasses
  `)
  const row = rows[0]
  const totalUsers = Number(row.total_users)
  if (totalUsers < config.publicStatsMinUsers) return { belowThreshold: true }
  return {
    activeUsers30d: Number(row.active_users_30d),
    totalUsers,
    weightEntries: Number(row.weight_entries),
    habitsCompleted: Number(row.habits_completed),
    waterGlasses: Number(row.water_glasses),
    updatedAt: new Date().toISOString(),
  }
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public/stats', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300')

    const allowed = await countAndAllow(
      app,
      `rl:public-stats:${sha256(request.ip)}`,
      RATE_LIMIT,
      RATE_WINDOW_SECONDS,
    )
    if (!allowed) return reply.code(429).send({ error: 'RATE_LIMITED' })

    const cached = await withRedis(app, (redis) => redis.get(CACHE_KEY))
    if (typeof cached === 'string') return reply.type('application/json').send(cached)

    const payload = JSON.stringify(await computeStats())
    await withRedis(app, async (redis) => {
      await redis.set(CACHE_KEY, payload, 'EX', CACHE_SECONDS)
    })
    return reply.type('application/json').send(payload)
  })
}
