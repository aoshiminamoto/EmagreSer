import { randomUUID } from 'node:crypto'
import type { FastifyReply } from 'fastify'
import { config } from '../config.js'
import { query, withTransaction } from '../db/pool.js'
import { httpError } from '../errors.js'
import { setRefreshCookie } from '../plugins/auth.js'
import { hashToken, newOpaqueToken } from './crypto.js'
import { createAccessToken } from './tokens.js'

interface RefreshRow {
  user_id: string
  family_id: string
  revoked_at: Date | null
  expires_at: Date
}

interface RotationResult {
  userId: string
  familyId?: string
  reused: boolean
}

export async function issueSession(
  userId: string,
  reply: FastifyReply,
  familyId: string = randomUUID(),
): Promise<string> {
  const token = newOpaqueToken()
  await query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 * interval '1 day'))`,
    [userId, familyId, hashToken(token), config.refreshTokenTtlDays],
  )
  setRefreshCookie(reply, token)
  return createAccessToken(userId)
}

/** Rotaciona o refresh token; reuso de token revogado encerra todas as sessões da conta. */
export async function rotateSession(
  token: string,
  reply: FastifyReply,
): Promise<{ accessToken: string; userId: string }> {
  const tokenHash = hashToken(token)
  const result = await withTransaction(async (client): Promise<RotationResult> => {
    const { rows } = await client.query<RefreshRow>(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
       RETURNING user_id, family_id`,
      [tokenHash],
    )
    const valid = rows[0]
    if (valid !== undefined) {
      return { userId: valid.user_id, familyId: valid.family_id, reused: false }
    }

    const { rows: existing } = await client.query<RefreshRow>(
      `SELECT user_id, family_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash],
    )
    const found = existing[0]
    if (found !== undefined && found.revoked_at !== null) {
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [found.user_id],
      )
      return { userId: found.user_id, reused: true }
    }
    return { userId: '', reused: false }
  })

  if (result.reused) throw httpError(401, 'REFRESH_TOKEN_REUSED')
  if (result.familyId === undefined) throw httpError(401, 'INVALID_REFRESH_TOKEN')
  return {
    accessToken: await issueSession(result.userId, reply, result.familyId),
    userId: result.userId,
  }
}

export async function revokeFamilyByToken(token: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)
       AND revoked_at IS NULL`,
    [hashToken(token)],
  )
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  )
}

export async function touchLastSeen(userId: string): Promise<void> {
  await query(
    `UPDATE users SET last_seen_at = now()
     WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 day')`,
    [userId],
  )
}
