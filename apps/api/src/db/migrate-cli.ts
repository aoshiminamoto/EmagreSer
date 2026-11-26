import { pathToFileURL } from 'node:url'
import { runMigrations } from './migrate.js'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up'
  await runMigrations(direction)
  console.log(`migrações ${direction} concluídas`)
}
