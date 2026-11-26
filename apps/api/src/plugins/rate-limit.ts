import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { httpError } from '../errors.js'
import { sha256 } from '../services/crypto.js'
import { withRedis } from './redis.js'

/** Contador com janela fixa. Com Redis fora, a função falha aberta. */
export async function countAndAllow(
  app: FastifyInstance,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const allowed = await withRedis(app, async (redis) => {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count <= limit
  })
  return allowed ?? true
}

export async function getCount(app: FastifyInstance, key: string): Promise<number> {
  const value = await withRedis(app, (redis) => redis.get(key))
  return value === null ? 0 : Number(value) || 0
}

export async function clearKey(app: FastifyInstance, key: string): Promise<void> {
  await withRedis(app, (redis) => redis.del(key))
}

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    if (!request.url.startsWith('/api/v1/') || request.url.startsWith('/api/v1/health')) return
    const allowed = await countAndAllow(
      app,
      `rl:ip:${sha256(request.ip)}`,
      config.generalRateLimit,
      config.generalRateWindowSeconds,
    )
    if (!allowed) throw httpError(429, 'RATE_LIMITED')
  })
}
