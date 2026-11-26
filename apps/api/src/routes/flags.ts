import type { FastifyInstance, FastifyRequest } from 'fastify'
import { query } from '../db/pool.js'
import { getEvaluatedFlags, type FlagUser } from '../flags/evaluate.js'
import { requireAuth } from '../plugins/auth.js'

/** Login é opcional: um token ausente ou inválido vira consulta anônima. */
async function optionalUser(request: FastifyRequest): Promise<FlagUser | null> {
  if (request.headers.authorization === undefined) return null
  try {
    await requireAuth(request)
    if (request.userId === null) return null
    const { rows } = await query<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [
      request.userId,
    ])
    const user = rows[0]
    return user === undefined ? null : { id: request.userId, email: user.email }
  } catch {
    return null
  }
}

export async function flagRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/flags', async (request) => {
    return getEvaluatedFlags(app, await optionalUser(request))
  })
}
