import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { config } from '../config.js'
import { isUniqueViolation, query, withTransaction } from '../db/pool.js'
import { httpError } from '../errors.js'
import {
  clearRefreshCookie,
  readRefreshToken,
  requireAuth,
  requireUserId,
} from '../plugins/auth.js'
import { sha256 } from '../services/crypto.js'
import {
  clearLoginFailures,
  isLoginBlocked,
  loginKeys,
  registerLoginFailure,
} from '../services/login-attempts.js'
import { sendPasswordResetMail } from '../services/mailer.js'
import { hashPassword, verifyPassword } from '../services/passwords.js'
import {
  issueSession,
  revokeAllSessions,
  revokeFamilyByToken,
  rotateSession,
  touchLastSeen,
} from '../services/sessions.js'
import { newResetToken } from '../services/tokens.js'

const registerSchema = z
  .object({
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(8),
    consent: z.boolean(),
    displayName: z.string().trim().min(1).max(80).nullish(),
  })
  .strict()

const loginSchema = z
  .object({
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
  })
  .strict()

const emailSchema = z
  .object({ email: z.email().transform((value) => value.toLowerCase()) })
  .strict()
const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) }).strict()

function sendAccess(reply: FastifyReply, accessToken: string) {
  return reply.send({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: config.accessTokenTtlSeconds,
  })
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)
    if (body.consent !== true) throw httpError(400, 'CONSENT_REQUIRED')

    const passwordHash = await hashPassword(body.password)
    let userId: string
    try {
      userId = await withTransaction(async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO users (email, password_hash, display_name, consent_at)
           VALUES ($1, $2, $3, now()) RETURNING id`,
          [body.email, passwordHash, body.displayName ?? null],
        )
        const id = rows[0].id
        await client.query(
          `INSERT INTO user_settings (user_id, client_updated_at, change_seq)
           VALUES ($1, now(), nextval('change_seq'))`,
          [id],
        )
        return id
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw httpError(409, 'EMAIL_ALREADY_EXISTS')
      throw error
    }

    reply.code(201)
    return sendAccess(reply, await issueSession(userId, reply))
  })

  app.post('/api/v1/auth/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)
    const keys = loginKeys(email, request.ip)
    if (await isLoginBlocked(app, keys)) throw httpError(429, 'TOO_MANY_ATTEMPTS')

    const { rows } = await query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email],
    )
    const user = rows[0]
    if (user === undefined || !(await verifyPassword(user.password_hash, password))) {
      await registerLoginFailure(app, keys)
      throw httpError(401, 'INVALID_CREDENTIALS')
    }

    await clearLoginFailures(app, keys)
    return sendAccess(reply, await issueSession(user.id, reply))
  })

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const token = readRefreshToken(request)
    if (token === undefined) throw httpError(401, 'INVALID_REFRESH_TOKEN')
    const session = await rotateSession(token, reply)
    await touchLastSeen(session.userId)
    return sendAccess(reply, session.accessToken)
  })

  app.post('/api/v1/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const token = readRefreshToken(request)
    if (token !== undefined) {
      await revokeFamilyByToken(token)
    } else {
      await revokeAllSessions(requireUserId(request))
    }
    clearRefreshCookie(reply)
    return reply.send({ ok: true })
  })

  app.post('/api/v1/auth/forgot-password', async (request, reply) => {
    const { email } = emailSchema.parse(request.body)
    const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email])
    const user = rows[0]
    if (user !== undefined) {
      const { token, hash } = newResetToken()
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '30 minutes')`,
        [user.id, hash],
      )
      try {
        await sendPasswordResetMail(user.id, email, token)
      } catch {
        // A resposta não pode revelar se o e-mail existe nem se o SMTP falhou.
        request.log.error({ code: 'MAIL_ERROR' }, 'falha ao enviar e-mail de recuperação')
      }
    }
    return reply.code(202).send({ ok: true })
  })

  app.post('/api/v1/auth/reset-password', async (request, reply) => {
    const { token, password } = resetSchema.parse(request.body)
    const passwordHash = await hashPassword(password)
    await withTransaction(async (client) => {
      const { rows } = await client.query<{ user_id: string }>(
        `UPDATE password_reset_tokens SET used_at = now()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING user_id`,
        [sha256(token)],
      )
      const reset = rows[0]
      if (reset === undefined) throw httpError(400, 'INVALID_RESET_TOKEN')
      await client.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
        reset.user_id,
        passwordHash,
      ])
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [reset.user_id],
      )
    })
    return reply.send({ ok: true })
  })
}
