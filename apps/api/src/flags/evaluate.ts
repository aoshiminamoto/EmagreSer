import type { FastifyInstance } from 'fastify'
import { query } from '../db/pool.js'
import { withRedis } from '../plugins/redis.js'
import { sha256 } from '../services/crypto.js'
import type { ServerLocale } from '../services/locale.js'
import { flagsCacheKey } from './cache.js'

export type FlagKey = 'i18n_en' | 'i18n_es'
export type FlagState = 'off' | 'testers' | 'percent' | 'on'

export interface FlagRecord {
  key: string
  state: string
  rollout_percent: number
  tester_emails: string[]
}

export interface FlagUser {
  id: string
  email: string
}

export interface EvaluatedFlags {
  flags: Record<FlagKey, boolean>
  locales: ServerLocale[]
}

const cacheTtlSeconds = 60

const localeByFlag: Record<FlagKey, ServerLocale> = {
  i18n_en: 'en-US',
  i18n_es: 'es-419',
}

/** RN-15/4.7: `percent` inclui testadores; sem usuário, só `on` vale. */
export function evaluateFlag(flag: FlagRecord | undefined, user: FlagUser | null): boolean {
  if (flag === undefined || flag.state === 'off') return false
  if (flag.state === 'on') return true
  if (user === null) return false

  const isTester = flag.tester_emails.some(
    (email) => email.toLowerCase() === user.email.toLowerCase(),
  )
  if (flag.state === 'testers') return isTester
  if (flag.state === 'percent') {
    if (isTester) return true
    const bucket = Number.parseInt(sha256(user.id).slice(0, 8), 16) % 100
    return bucket < flag.rollout_percent
  }
  return false
}

export async function loadFlags(): Promise<FlagRecord[]> {
  const { rows } = await query<FlagRecord>(
    `SELECT key, state, rollout_percent, tester_emails FROM feature_flags
      WHERE key IN ('i18n_en', 'i18n_es')`,
  )
  return rows
}

export function evaluateFlags(rows: FlagRecord[], user: FlagUser | null): EvaluatedFlags {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const flags: Record<FlagKey, boolean> = {
    i18n_en: evaluateFlag(byKey.get('i18n_en'), user),
    i18n_es: evaluateFlag(byKey.get('i18n_es'), user),
  }
  const locales: ServerLocale[] = ['pt-BR']
  for (const key of ['i18n_en', 'i18n_es'] as const) {
    if (flags[key]) locales.push(localeByFlag[key])
  }
  return { flags, locales }
}

/** Cache de 60 s no Redis; sem Redis a avaliação vem direto do PostgreSQL. */
export async function getEvaluatedFlags(
  app: FastifyInstance,
  user: FlagUser | null,
): Promise<EvaluatedFlags> {
  const key = flagsCacheKey(user?.id ?? null)
  const cached = await withRedis(app, (redis) => redis.get(key))
  if (cached !== null) {
    try {
      return JSON.parse(cached) as EvaluatedFlags
    } catch {
      // Cache corrompido é recalculado abaixo.
    }
  }
  const result = evaluateFlags(await loadFlags(), user)
  await withRedis(app, (redis) => redis.set(key, JSON.stringify(result), 'EX', cacheTtlSeconds))
  return result
}
