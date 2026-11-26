import { fileURLToPath } from 'node:url'
import { runner } from 'node-pg-migrate'
import { config } from '../config.js'

export async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  await runner({
    databaseUrl: config.databaseUrl,
    dir: fileURLToPath(new URL('./migrations/', import.meta.url)),
    migrationsTable: 'pgmigrations',
    direction,
    log: () => {},
  })
}
