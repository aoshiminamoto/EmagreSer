import { Redis } from 'ioredis'
import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
  interface FastifyRequest {
    userId: string | null
  }
}

export async function registerRedis(app: FastifyInstance): Promise<void> {
  const client = new Redis(config.redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      return times > 3 ? null : Math.min(times * 200, 1000)
    },
  })
  // Redis é otimização: falhas de conexão não derrubam a API nem poluem os logs.
  client.on('error', () => {})
  app.decorate('redis', client)
  app.addHook('onClose', async () => {
    client.disconnect()
  })
}

/** Executa a operação no Redis; devolve nulo quando ele não está disponível. */
export async function withRedis<T>(
  app: FastifyInstance,
  operation: (client: Redis) => Promise<T>,
): Promise<T | null> {
  if (app.redis.status !== 'ready') return null
  try {
    return await operation(app.redis)
  } catch {
    return null
  }
}
