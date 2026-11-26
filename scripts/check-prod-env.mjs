// Falha se as flags de desenvolvimento estiverem ligadas em um build de produção.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const flags = ['VITE_ALLOW_DESKTOP', 'VITE_FORCE_LOCALES']
const enabled = new Set(['1', 'true', 'yes', 'on'])
const failures = []

for (const flag of flags) {
  const fromEnv = process.env[flag]
  if (fromEnv && enabled.has(fromEnv.trim().toLowerCase())) failures.push(`${flag}=${fromEnv}`)
}

for (const file of ['.env.production', 'apps/web/.env.production']) {
  const path = join(root, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([\w]+)\s*=\s*(.*?)\s*$/)
    if (!match || !flags.includes(match[1])) continue
    if (enabled.has(match[2].replace(/^['"]|['"]$/g, '').toLowerCase())) {
      failures.push(`${file}: ${match[1]}=${match[2]}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Flags de produção devem ficar desligadas: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('check:prod-env: ok (VITE_ALLOW_DESKTOP e VITE_FORCE_LOCALES desligadas)')
