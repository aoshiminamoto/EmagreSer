import { randomBytes } from 'node:crypto'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Os testes de integração compartilham Postgres/Redis e truncam as tabelas: um por vez.
    fileParallelism: false,
    // Respeita o ambiente do CI; os valores abaixo são só o padrão local.
    env: {
      LOG_LEVEL: 'silent',
      JWT_SECRET: process.env.JWT_SECRET ?? randomBytes(32).toString('hex'),
      COOKIE_SECRET: process.env.COOKIE_SECRET ?? randomBytes(32).toString('hex'),
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://emagreser:emagreser@127.0.0.1:55432/emagreser',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
      SMTP_URL: process.env.SMTP_URL ?? 'smtp://127.0.0.1:2525',
      SMTP_FROM: process.env.SMTP_FROM ?? 'EmagreSer <nao-responda@emagreser.local>',
      APP_ORIGIN: process.env.APP_ORIGIN ?? 'http://localhost:3000',
    },
  },
})
