import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

loadEnv()

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export interface AppConfig {
  port: number
  host: string
  nodeEnv: string
  logLevel: string
  webDist: string
}

export const config: AppConfig = {
  port: numberFrom(process.env.PORT, 3000),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  webDist: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
}
