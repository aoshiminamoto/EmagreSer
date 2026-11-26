import { readFile } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import helmet from '@fastify/helmet'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
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

  await app.register(healthRoutes)

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
