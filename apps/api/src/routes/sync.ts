import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { withTransaction } from '../db/pool.js'
import { requireAuth, requireUserId } from '../plugins/auth.js'
import { touchLastSeen } from '../services/sessions.js'
import { applyBatch, pullChanges, pushBodySchema } from '../services/sync.js'

const pullQuerySchema = z
  .object({
    cursor: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(500).default(500),
  })
  .strict()

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/sync/push', { preHandler: requireAuth }, async (request) => {
    const body = pushBodySchema.parse(request.body)
    const userId = requireUserId(request)
    const result = await withTransaction((client) => applyBatch(client, userId, body.changes))
    await touchLastSeen(userId)
    return result
  })

  app.get('/api/v1/sync/pull', { preHandler: requireAuth }, async (request) => {
    const { cursor, limit } = pullQuerySchema.parse(request.query)
    return pullChanges(requireUserId(request), cursor, limit)
  })
}
