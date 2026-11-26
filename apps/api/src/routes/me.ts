import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { httpError } from '../errors.js'
import { requireAuth, requireUserId } from '../plugins/auth.js'
import {
  clearCachedProfile,
  getCachedProfile,
  setCachedProfile,
  type CachedProfile,
} from '../services/session-cache.js'

const patchSchema = z.object({ displayName: z.string().trim().min(1).max(80).nullable() }).strict()

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
}
