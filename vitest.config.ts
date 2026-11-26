import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['apps/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    env: { LOG_LEVEL: 'silent' },
  },
})
