import { query } from '../db/pool.js'
import { sha256 } from './crypto.js'

export type ServerLocale = 'pt-BR' | 'en-US' | 'es-419'

const flagByLocale: Record<'en-US' | 'es-419', string> = {
  'en-US': 'i18n_en',
  'es-419': 'i18n_es',
}

interface FlagRow {
  state: string
  rollout_percent: number
  tester_emails: string[]
}

/**
 * RN-15 no servidor: a preferência salva só vale se o flag correspondente
 * estiver liberado para o usuário; pt-BR é sempre o fallback.
 */
export async function serverLocaleFor(userId: string, email: string): Promise<ServerLocale> {
  const { rows } = await query<{ locale: string }>(
    `SELECT locale FROM user_settings WHERE user_id = $1`,
    [userId],
  )
  const preferred = rows[0]?.locale
  if (preferred !== 'en-US' && preferred !== 'es-419') return 'pt-BR'

  const key = flagByLocale[preferred]
  const flags = await query<FlagRow>(
    `SELECT state, rollout_percent, tester_emails FROM feature_flags WHERE key = $1`,
    [key],
  )
  const flag = flags.rows[0]
  if (flag === undefined || flag.state === 'off') return 'pt-BR'
  if (flag.state === 'on') return preferred
  if (flag.state === 'testers' && flag.tester_emails.includes(email.toLowerCase())) return preferred
  if (flag.state === 'percent') {
    const bucket = Number.parseInt(sha256(userId).slice(0, 8), 16) % 100
    if (bucket < flag.rollout_percent) return preferred
  }
  return 'pt-BR'
}
