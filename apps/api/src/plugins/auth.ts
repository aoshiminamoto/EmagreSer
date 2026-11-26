import { jwtVerify } from 'jose'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config.js'
import { httpError } from '../errors.js'

export const REFRESH_COOKIE = 'refreshToken'
export const REFRESH_COOKIE_PATH = '/api/v1/auth'

const secretKey = new TextEncoder().encode(config.jwtSecret)

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) throw httpError(401, 'UNAUTHORIZED')
  try {
    const { payload } = await jwtVerify(header.slice(7), secretKey, {
      algorithms: ['HS256'],
      issuer: 'emagreser',
    })
    if (typeof payload.sub !== 'string') throw new Error('sub inválido')
    request.userId = payload.sub
  } catch {
    throw httpError(401, 'UNAUTHORIZED')
  }
}

export function requireUserId(request: FastifyRequest): string {
  if (request.userId === null) throw httpError(401, 'UNAUTHORIZED')
  return request.userId
}

export function readRefreshToken(request: FastifyRequest): string | undefined {
  const raw = request.cookies[REFRESH_COOKIE]
  if (!raw) return undefined
  const result = request.unsignCookie(raw)
  return result.valid ? result.value : undefined
}

export function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60,
    signed: true,
  })
}

export function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
}
