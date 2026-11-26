import { readFile } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { config } from './config.js'
import { HttpError } from './errors.js'
import { registerRedis } from './plugins/redis.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'

interface LogStream {
  write(message: string): void
}

export async function buildServer(logStream?: LogStream) {
  const app = Fastify({
    logger: {
      level: logStream === undefined ? config.logLevel : 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      ...(logStream === undefined ? {} : { stream: logStream }),
    },
    trustProxy: true,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        // Vuetify aplica estilos inline dinâmicos; scripts continuam sem eval.
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
      },
    },
  })

  await registerRedis(app)
  app.decorateRequest('userId', null)
  await app.register(cookie, { secret: config.cookieSecret })
  await rateLimitPlugin(app)

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.code })
    }
    if (
      error instanceof ZodError ||
      (typeof error === 'object' && error !== null && 'validation' in error)
    ) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR' })
    }
    // Sem mensagem nem pilha: evita vazar e-mail, dado de saúde ou SQL nos logs.
    request.log.error({ code: 'INTERNAL_ERROR' }, 'erro não tratado')
    return reply.code(500).send({ error: 'INTERNAL_ERROR' })
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(meRoutes)

  await app.register(fastifyStatic, {
    root: config.webDist,
    prefix: '/',
    setHeaders(reply, filePath) {
      if (filePath.includes(`${sep}assets${sep}`)) {
        reply.header('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (['index.html', 'sw.js', 'manifest.webmanifest'].includes(basename(filePath))) {
        reply.header('Cache-Control', 'no-cache')
      }
    },
  })

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'NOT_FOUND' })
    }
    reply.header('Cache-Control', 'no-cache')
    return reply.type('text/html').send(await readFile(join(config.webDist, 'index.html'), 'utf8'))
  })

  return app
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await buildServer()
  await app.listen({ port: config.port, host: config.host })
}
