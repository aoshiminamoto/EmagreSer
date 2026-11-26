import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { withRedis } from '../plugins/redis.js'

export interface CachedProfile {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

function keyOf(userId: string): string {
  return `session:user:${userId}`
}

export async function getCachedProfile(
  app: FastifyInstance,
  userId: string,
): Promise<CachedProfile | null> {
  const raw = await withRedis(app, (redis) => redis.get(keyOf(userId)))
  if (raw === null) return null
  try {
    return JSON.parse(raw) as CachedProfile
  } catch {
    return null
  }
}

export async function setCachedProfile(
  app: FastifyInstance,
  userId: string,
  profile: CachedProfile,
): Promise<void> {
  await withRedis(app, (redis) =>
    redis.set(keyOf(userId), JSON.stringify(profile), 'EX', config.sessionCacheTtlSeconds),
  )
}

export async function clearCachedProfile(app: FastifyInstance, userId: string): Promise<void> {
  await withRedis(app, (redis) => redis.del(keyOf(userId)))
}
