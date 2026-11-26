import type { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'
import { SMTPServer } from 'smtp-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../config.js'
import { pool, query } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { buildServer } from '../server.js'

const smtpPort = 2525
const mailbox: string[] = []
let smtp: SMTPServer
const flushClient = new Redis(config.redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
})

function cookieOf(response: { headers: Record<string, unknown> }): string {
  const raw = response.headers['set-cookie']
  const value = Array.isArray(raw) ? raw[0] : raw
  return String(value).split(';')[0]
}

async function withServer(
  run: (app: FastifyInstance) => Promise<void>,
  stream?: { write(message: string): void },
): Promise<void> {
  const app = await buildServer(stream)
  try {
    await run(app)
  } finally {
    await app.close()
  }
}

function decodeQuotedPrintable(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
}

async function waitForMail(): Promise<string> {
  const deadline = Date.now() + 5000
  while (mailbox.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  if (mailbox.length === 0) throw new Error('e-mail de recuperação não recebido')
  return mailbox.shift() as string
}

async function register(app: FastifyInstance, email = 'ana@example.com', password = 'Senha@123') {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password, consent: true },
  })
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  await runMigrations()
  // A migração também é reaplicável sem erro.
  await runMigrations()

  smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS', 'AUTH'],
    onData(stream, _session, callback) {
      let raw = ''
      stream.on('data', (chunk: Buffer) => {
        raw += chunk.toString('utf8')
      })
      stream.on('end', () => {
        mailbox.push(raw)
        callback(null, '250 Ok')
      })
    },
  })
  await new Promise<void>((resolve, reject) => {
    smtp.once('error', reject)
    smtp.listen(smtpPort, '127.0.0.1', () => {
      smtp.off('error', reject)
      resolve()
    })
  })
}, 30000)

beforeEach(async () => {
  await query(
    `TRUNCATE users, refresh_tokens, password_reset_tokens, user_settings, weight_entries,
     milestones, habits, habit_logs, water_logs, push_subscriptions RESTART IDENTITY CASCADE`,
  )
  await query(`UPDATE feature_flags SET state = 'off', rollout_percent = 0, tester_emails = '{}'`)
  await query(`SELECT setval('change_seq', 1, false)`)
  mailbox.length = 0
  if (flushClient.status === 'end') await flushClient.connect().catch(() => {})
  await flushClient.flushdb().catch(() => {})
})

afterAll(async () => {
  flushClient.disconnect()
  await new Promise<void>((resolve) => smtp.close(() => resolve()))
  await pool.end()
})

describe('registro e login', () => {
  it('cadastra com consentimento e cria configurações padrão', async () => {
    await withServer(async (app) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'Ana@Example.com',
          password: ' Senha@123 ',
          consent: true,
          displayName: 'Ana',
        },
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().accessToken).toBeTypeOf('string')

      const user = await query<{ email: string; consent_at: Date; display_name: string }>(
        `SELECT email, consent_at, display_name FROM users`,
      )
      expect(user.rows[0].email).toBe('ana@example.com')
      expect(user.rows[0].consent_at).not.toBeNull()
      expect(user.rows[0].display_name).toBe('Ana')

      const settings = await query<{
        water_goal_glasses: number
        locale: string
        bmi_visible: boolean
      }>(`SELECT water_goal_glasses, locale, bmi_visible FROM user_settings`)
      expect(settings.rows[0].water_goal_glasses).toBe(8)
      expect(settings.rows[0].locale).toBe('pt-BR')
      expect(settings.rows[0].bmi_visible).toBe(false)
    })
  })

  it('recusa cadastro sem consentimento', async () => {
    await withServer(async (app) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'ana@example.com', password: 'Senha@123', consent: false },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ error: 'CONSENT_REQUIRED' })
      expect((await query(`SELECT 1 FROM users`)).rows).toHaveLength(0)
    })
  })

  it('recusa e-mail repetido em qualquer caixa', async () => {
    await withServer(async (app) => {
      await register(app)
      const response = await register(app, 'ANA@example.com')
      expect(response.statusCode).toBe(409)
      expect(response.json()).toEqual({ error: 'EMAIL_ALREADY_EXISTS' })
    })
  })

  it('faz login e devolve cookie HttpOnly e SameSite=Strict', async () => {
    await withServer(async (app) => {
      await register(app)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ANA@example.com', password: 'Senha@123' },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().accessToken).toBeTypeOf('string')
      const setCookie = String(response.headers['set-cookie'])
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Strict')
    })
  })

  it('devolve erro genérico para senha errada e e-mail inexistente', async () => {
    await withServer(async (app) => {
      await register(app)
      const wrongPassword = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ana@example.com', password: 'Errada@123' },
      })
      const unknownEmail = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ninguem@example.com', password: 'Senha@123' },
      })
      expect(wrongPassword.statusCode).toBe(401)
      expect(wrongPassword.json()).toEqual({ error: 'INVALID_CREDENTIALS' })
      expect(unknownEmail.statusCode).toBe(401)
      expect(unknownEmail.json()).toEqual({ error: 'INVALID_CREDENTIALS' })
    })
  })

  it('bloqueia o login após cinco tentativas fracassadas', async () => {
    await withServer(async (app) => {
      await register(app)
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'ana@example.com', password: 'Errada@123' },
        })
        expect(response.statusCode).toBe(401)
      }
      const blocked = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ana@example.com', password: 'Senha@123' },
      })
      expect(blocked.statusCode).toBe(429)
      expect(blocked.json()).toEqual({ error: 'TOO_MANY_ATTEMPTS' })
    })
  })
})

describe('sessões', () => {
  it('rotaciona o refresh token e detecta reuso', async () => {
    await withServer(async (app) => {
      const created = await register(app)
      const cookie = cookieOf(created)
      const refresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      expect(refresh.statusCode).toBe(200)
      const rotatedCookie = cookieOf(refresh)
      expect(rotatedCookie).not.toBe(cookie)
      expect(refresh.json().accessToken).toBeTypeOf('string')

      const reuse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      expect(reuse.statusCode).toBe(401)
      expect(reuse.json()).toEqual({ error: 'REFRESH_TOKEN_REUSED' })

      const afterReuse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie: rotatedCookie },
      })
      expect(afterReuse.statusCode).toBe(401)
    })
  })

  it('logout encerra a família e o reuso encerra a conta', async () => {
    await withServer(async (app) => {
      const created = await register(app)
      const firstCookie = cookieOf(created)
      const rotated = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie: firstCookie },
      })
      const secondCookie = cookieOf(rotated)
      const logout = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { ...bearer(created.json().accessToken), cookie: secondCookie },
      })
      expect(logout.statusCode).toBe(200)
      expect(String(logout.headers['set-cookie'])).toContain('refreshToken=;')

      // Outra família de sessões: o reuso deve encerrar a conta inteira.
      const otherLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ana@example.com', password: 'Senha@123' },
      })
      expect(otherLogin.statusCode).toBe(200)

      const reuse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie: firstCookie },
      })
      expect(reuse.statusCode).toBe(401)
      expect(reuse.json()).toEqual({ error: 'REFRESH_TOKEN_REUSED' })
      const sessions = await query<{ revoked_at: Date | null }>(
        `SELECT revoked_at FROM refresh_tokens`,
      )
      expect(sessions.rows.every((row) => row.revoked_at !== null)).toBe(true)
    })
  })

  it('atualiza last_seen_at no refresh no máximo uma vez por dia', async () => {
    await withServer(async (app) => {
      let cookie = cookieOf(await register(app))
      let response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      cookie = cookieOf(response)
      const now = await query<{ last_seen_at: Date }>(`SELECT last_seen_at FROM users`)
      expect(now.rows[0].last_seen_at).not.toBeNull()

      await query(`UPDATE users SET last_seen_at = now()`)
      const baseline = await query<{ last_seen_at: Date }>(`SELECT last_seen_at FROM users`)
      response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      cookie = cookieOf(response)
      const unchanged = await query<{ last_seen_at: Date }>(`SELECT last_seen_at FROM users`)
      expect(unchanged.rows[0].last_seen_at.toISOString()).toBe(
        baseline.rows[0].last_seen_at.toISOString(),
      )

      await query(`UPDATE users SET last_seen_at = now() - interval '2 days'`)
      await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } })
      const updated = await query<{ last_seen_at: Date }>(`SELECT last_seen_at FROM users`)
      expect(updated.rows[0].last_seen_at.getTime()).toBeGreaterThan(
        now.rows[0].last_seen_at.getTime(),
      )
    })
  })

  it('autentica pelo PostgreSQL mesmo com Redis indisponível', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6399')
    vi.resetModules()
    const { buildServer: buildWithoutRedis } = await import('../server.js')
    const app = await buildWithoutRedis()
    try {
      const created = await register(app)
      expect(created.statusCode).toBe(201)
      const cookie = cookieOf(created)
      const refresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      expect(refresh.statusCode).toBe(200)
      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: bearer(refresh.json().accessToken),
      })
      expect(me.statusCode).toBe(200)
    } finally {
      await app.close()
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })
})

describe('recuperação de senha', () => {
  it('envia o link, troca a senha, encerra sessões e impede reuso', async () => {
    await withServer(async (app) => {
      const created = await register(app)
      const cookie = cookieOf(created)
      const forgot = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'ana@example.com' },
      })
      expect(forgot.statusCode).toBe(202)
      expect(forgot.json()).toEqual({ ok: true })

      const mail = await waitForMail()
      expect(mail).toContain('Content-Language: pt-BR')
      const match = decodeQuotedPrintable(mail).match(/token=([\w-]+)/)
      expect(match).not.toBeNull()
      const token = (match as RegExpMatchArray)[1]

      const reset = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { token, password: 'NovaSenha@123' },
      })
      expect(reset.statusCode).toBe(200)

      const oldLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ana@example.com', password: 'Senha@123' },
      })
      expect(oldLogin.statusCode).toBe(401)
      const newLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ana@example.com', password: 'NovaSenha@123' },
      })
      expect(newLogin.statusCode).toBe(200)

      const oldSession = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie },
      })
      expect(oldSession.statusCode).toBe(401)

      const reuse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { token, password: 'OutraSenha@123' },
      })
      expect(reuse.statusCode).toBe(400)
      expect(reuse.json()).toEqual({ error: 'INVALID_RESET_TOKEN' })
    })
  })

  it('responde igualmente para e-mail inexistente e não envia nada', async () => {
    await withServer(async (app) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'ninguem@example.com' },
      })
      expect(response.statusCode).toBe(202)
      expect(response.json()).toEqual({ ok: true })
      expect(mailbox).toHaveLength(0)
    })
  })

  it('usa os idiomas efetivos do servidor no e-mail', async () => {
    await withServer(async (app) => {
      const created = await register(app)
      const userId = (await query<{ id: string }>(`SELECT id FROM users`)).rows[0].id
      await query(`UPDATE user_settings SET locale = 'en-US' WHERE user_id = $1`, [userId])
      await query(`UPDATE feature_flags SET state = 'on' WHERE key = 'i18n_en'`)

      const forgot = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'ana@example.com' },
      })
      expect(forgot.statusCode).toBe(202)
      const mail = await waitForMail()
      expect(mail).toContain('Content-Language: en-US')
      expect(mail).toContain('Reset your EmagreSer password')
      expect(created.statusCode).toBe(201)
    })
  })
})

describe('perfil', () => {
  it('exige token e permite ler e atualizar o perfil', async () => {
    await withServer(async (app) => {
      const created = await register(app)
      const token = created.json().accessToken
      expect((await app.inject({ method: 'GET', url: '/api/v1/me' })).statusCode).toBe(401)

      const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: bearer(token) })
      expect(me.statusCode).toBe(200)
      expect(me.json()).toMatchObject({ email: 'ana@example.com', displayName: null })

      const patch = await app.inject({
        method: 'PATCH',
        url: '/api/v1/me',
        headers: bearer(token),
        payload: { displayName: 'Ana Maria' },
      })
      expect(patch.statusCode).toBe(200)
      expect(patch.json().displayName).toBe('Ana Maria')

      const cached = await app.inject({ method: 'GET', url: '/api/v1/me', headers: bearer(token) })
      expect(cached.json().displayName).toBe('Ana Maria')

      const invalid = await app.inject({
        method: 'PATCH',
        url: '/api/v1/me',
        headers: bearer(token),
        payload: { displayName: 42 },
      })
      expect(invalid.statusCode).toBe(400)
      expect(invalid.json()).toEqual({ error: 'VALIDATION_ERROR' })
    })
  })

  it('não grava e-mail nem senha nos logs', async () => {
    const lines: string[] = []
    const stream: { write(message: string): void } = {
      write(message: string) {
        lines.push(message)
      },
    }
    await withServer(async (app) => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'sigiloso@example.com',
          password: 'SenhaMuitoSecreta@123',
          consent: true,
        },
      })
    }, stream)
    const log = lines.join('')
    expect(log).not.toContain('sigiloso@example.com')
    expect(log).not.toContain('SenhaMuitoSecreta@123')
  })
})
