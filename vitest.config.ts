import { randomBytes } from 'node:crypto'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    env: {
      LOG_LEVEL: 'silent',
      JWT_SECRET: randomBytes(32).toString('hex'),
      COOKIE_SECRET: randomBytes(32).toString('hex'),
      DATABASE_URL: 'postgresql://emagreser:emagreser@localhost:55432/emagreser',
      REDIS_URL: 'redis://localhost:6379',
      SMTP_URL: 'smtp://127.0.0.1:2525',
      SMTP_FROM: 'EmagreSer <nao-responda@emagreser.local>',
      APP_ORIGIN: 'http://localhost:3000',
    },
  },
})
