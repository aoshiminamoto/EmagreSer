import { query } from '../db/pool.js'
import { evaluateFlag, type FlagRecord } from '../flags/evaluate.js'

export type ServerLocale = 'pt-BR' | 'en-US' | 'es-419'

const flagByLocale: Record<'en-US' | 'es-419', string> = {
  'en-US': 'i18n_en',
  'es-419': 'i18n_es',
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

  const flags = await query<FlagRecord>(
    `SELECT state, rollout_percent, tester_emails FROM feature_flags WHERE key = $1`,
    [flagByLocale[preferred]],
  )
  return evaluateFlag(flags.rows[0], { id: userId, email }) ? preferred : 'pt-BR'
}
