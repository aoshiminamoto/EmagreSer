import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../db/pool.js'
import { httpError } from '../errors.js'
import { clearRefreshCookie, requireAuth, requireUserId } from '../plugins/auth.js'
import { buildUserExport, exportToCsv } from '../services/export.js'
import { serverLocaleFor } from '../services/locale.js'
import { verifyPassword } from '../services/passwords.js'
import {
  clearCachedProfile,
  getCachedProfile,
  setCachedProfile,
  type CachedProfile,
} from '../services/session-cache.js'

const patchSchema = z.object({ displayName: z.string().trim().min(1).max(80).nullable() }).strict()
const exportQuerySchema = z.object({ format: z.enum(['json', 'csv']).default('json') }).strict()
const deleteSchema = z.object({ password: z.string().min(1), confirm: z.literal(true) }).strict()

const userTables = [
  'push_subscriptions',
  'refresh_tokens',
  'password_reset_tokens',
  'user_settings',
  'weight_entries',
  'habit_logs',
  'habits',
  'water_logs',
  'milestones',
] as const

async function loadProfile(userId: string): Promise<CachedProfile | null> {
  const { rows } = await query<{
    id: string
    email: string
    display_name: string | null
    created_at: Date
  }>(`SELECT id, email, display_name, created_at FROM users WHERE id = $1`, [userId])
  const user = rows[0]
  if (user === undefined) return null
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at.toISOString(),
  }
}

async function currentProfile(
  app: FastifyInstance,
  request: FastifyRequest,
): Promise<CachedProfile> {
  const userId = requireUserId(request)
  const cached = await getCachedProfile(app, userId)
  if (cached !== null) return cached
  const profile = await loadProfile(userId)
  if (profile === null) throw httpError(401, 'UNAUTHORIZED')
  await setCachedProfile(app, userId, profile)
  return profile
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/me', { preHandler: requireAuth }, async (request) =>
    currentProfile(app, request),
  )

  app.patch('/api/v1/me', { preHandler: requireAuth }, async (request) => {
    const body = patchSchema.parse(request.body)
    const userId = requireUserId(request)
    await query(`UPDATE users SET display_name = $2 WHERE id = $1`, [userId, body.displayName])
    await clearCachedProfile(app, userId)
    return currentProfile(app, request)
  })

  app.get('/api/v1/me/export', { preHandler: requireAuth }, async (request, reply) => {
    const { format } = exportQuerySchema.parse(request.query)
    const userId = requireUserId(request)
    const profile = await currentProfile(app, request)
    const locale = await serverLocaleFor(userId, profile.email)
    const data = await buildUserExport(userId, locale)
    const date = data.generatedAt.slice(0, 10)
    if (format === 'csv') {
      return reply
        .type('text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="emagreser-${date}.csv"`)
        .send(exportToCsv(data))
    }
    return reply
      .type('application/json; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="emagreser-${date}.json"`)
      .send(data)
  })

  app.delete('/api/v1/me', { preHandler: requireAuth }, async (request, reply) => {
    const { password } = deleteSchema.parse(request.body)
    const userId = requireUserId(request)
    const { rows } = await query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    )
    const user = rows[0]
    if (user === undefined || !(await verifyPassword(user.password_hash, password))) {
      throw httpError(401, 'INVALID_PASSWORD')
    }

    await withTransaction(async (client) => {
      for (const table of userTables) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId])
      }
      await client.query(`DELETE FROM users WHERE id = $1`, [userId])
    })
    await clearCachedProfile(app, userId)
    clearRefreshCookie(reply)
    return reply.send({ ok: true })
  })
}
