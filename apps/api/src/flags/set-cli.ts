// Gestão de flags sem painel: npm run flags:set -- i18n_en testers --emails a@x.com,b@x.com
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { Redis } from 'ioredis'
import { Pool } from 'pg'
import { flagsCachePattern } from './cache.js'

loadEnv({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) })

const usage =
  'Uso: npm run flags:set -- <i18n_en|i18n_es> <off|testers|percent|on> ' +
  '[--emails a@x.com,b@x.com|--percent 20]'

const [key, state, ...rest] = process.argv.slice(2)
const validKeys = ['i18n_en', 'i18n_es']
const validStates = ['off', 'testers', 'percent', 'on']

function optionValue(name: string): string | undefined {
  const index = rest.indexOf(name)
  return index === -1 ? undefined : rest[index + 1]
}

function fail(message: string): never {
  console.error(`${message}\n${usage}`)
  process.exit(1)
}

if (key === undefined || !validKeys.includes(key)) fail('Chave de flag inválida.')
if (state === undefined || !validStates.includes(state)) fail('Estado de flag inválido.')

let testerEmails: string[] | undefined
let rolloutPercent: number | undefined

if (state === 'testers') {
  const raw = optionValue('--emails')
  if (raw === undefined || raw.trim() === '') fail('Estado testers exige --emails.')
  testerEmails = raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
  if (testerEmails.length === 0) fail('Nenhum e-mail válido informado.')
}

if (state === 'percent') {
  const raw = optionValue('--percent') ?? rest[0]
  const parsed = Number(raw)
  if (raw === undefined || !Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    fail('Estado percent exige --percent entre 0 e 100.')
  }
  rolloutPercent = parsed
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://emagreser:emagreser@127.0.0.1:55432/emagreser',
})
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
})
redis.on('error', () => {})

try {
  const current = await pool.query<{ tester_emails: string[]; rollout_percent: number }>(
    `SELECT tester_emails, rollout_percent FROM feature_flags WHERE key = $1`,
    [key],
  )
  const row = current.rows[0]
  if (row === undefined) fail('Flag inexistente.')
  await pool.query(
    `UPDATE feature_flags
        SET state = $2, tester_emails = $3, rollout_percent = $4, updated_at = now()
      WHERE key = $1`,
    [key, state, testerEmails ?? row.tester_emails, rolloutPercent ?? row.rollout_percent],
  )

  try {
    await redis.connect()
    const keys = await redis.keys(flagsCachePattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    console.warn('Redis indisponível: cache de flags expira naturalmente em 60 segundos.')
  }
  console.log(`flags:set: ${key} = ${state}`)
} finally {
  await pool.end()
  if (redis.status !== 'end') redis.disconnect()
}
