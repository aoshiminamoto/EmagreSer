import { randomBytes } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'

/** E2E roda contra a API real (Postgres/Redis da compose) e o build do web. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run build && npm run start --workspace @emagreser/api',
    url: 'http://127.0.0.1:3000/api/v1/health',
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      JWT_SECRET: process.env.JWT_SECRET ?? randomBytes(32).toString('hex'),
      COOKIE_SECRET: process.env.COOKIE_SECRET ?? randomBytes(32).toString('hex'),
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://emagreser:emagreser@127.0.0.1:55432/emagreser',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
      COOKIE_SECURE: 'false',
      LOG_LEVEL: 'silent',
    },
  },
})
