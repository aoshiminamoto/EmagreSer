/** RF-38: chave pública VAPID e ciclo de vida da inscrição de Web Push. */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config.js'
import { query } from '../db/pool.js'
import { reminderService } from '../jobs/runtime.js'
import { requireAuth, requireUserId } from '../plugins/auth.js'

const subscribeSchema = z
  .object({
    endpoint: z
      .string()
      .url()
      .max(2048)
      .refine((value) => new URL(value).protocol === 'https:', { message: 'INVALID_ENDPOINT' }),
    keys: z
      .object({
        p256dh: z.string().min(1).max(512),
        auth: z.string().min(1).max(512),
      })
      .strict(),
  })
  .strict()

const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2048).optional() }).strict()

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/push/public-key', async () => ({ publicKey: config.vapidPublicKey }))

  app.post('/api/v1/push/subscribe', { preHandler: requireAuth }, async (request) => {
    const body = subscribeSchema.parse(request.body)
    const userId = requireUserId(request)
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [userId, body.endpoint, body.keys.p256dh, body.keys.auth],
    )
    try {
      await reminderService().schedule(userId)
    } catch {
      request.log.error({ code: 'REMINDER_SCHEDULE_FAILED' }, 'falha ao agendar lembrete')
    }
    return { ok: true }
  })

  app.delete('/api/v1/push/subscribe', { preHandler: requireAuth }, async (request) => {
    const body = unsubscribeSchema.parse(request.body ?? {})
    const userId = requireUserId(request)
    if (body.endpoint === undefined) {
      await query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId])
    } else {
      await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [
        userId,
        body.endpoint,
      ])
    }
    const { rows } = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    )
    if (rows[0]?.count === '0') {
      try {
        await reminderService().cancel(userId)
      } catch {
        request.log.error({ code: 'REMINDER_CANCEL_FAILED' }, 'falha ao cancelar lembrete')
      }
    }
    return { ok: true }
  })
}
