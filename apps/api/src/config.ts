import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) })

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function secretFrom(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  return value
}

function booleanFrom(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

export interface AppConfig {
  port: number
  host: string
  nodeEnv: string
  logLevel: string
  webDist: string
  databaseUrl: string
  redisUrl: string
  jwtSecret: string
  cookieSecret: string
  cookieSecure: boolean
  appOrigin: string
  smtpUrl: string
  mailFrom: string
  accessTokenTtlSeconds: number
  refreshTokenTtlDays: number
  loginAttemptLimit: number
  loginWindowSeconds: number
  generalRateLimit: number
  generalRateWindowSeconds: number
  sessionCacheTtlSeconds: number
}

export const config: AppConfig = {
  port: numberFrom(process.env.PORT, 3000),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  webDist: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://emagreser:emagreser@localhost:55432/emagreser',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: secretFrom('JWT_SECRET'),
  cookieSecret: secretFrom('COOKIE_SECRET'),
  cookieSecure: booleanFrom(
    process.env.COOKIE_SECURE,
    (process.env.NODE_ENV ?? 'development') === 'production',
  ),
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
  smtpUrl: process.env.SMTP_URL ?? 'smtp://localhost:1025',
  mailFrom: process.env.SMTP_FROM ?? 'EmagreSer <nao-responda@emagreser.local>',
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlDays: 30,
  loginAttemptLimit: 5,
  loginWindowSeconds: 15 * 60,
  generalRateLimit: numberFrom(process.env.GENERAL_RATE_LIMIT, 300),
  generalRateWindowSeconds: 60,
  sessionCacheTtlSeconds: 60,
}
