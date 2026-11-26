/**
 * Cliente das feature flags (RF-83). Consulta ao abrir, depois do login, ao
 * voltar ao primeiro plano e a cada 15 min; sempre guarda o último resultado
 * no IndexedDB. Sem cache, só pt-BR. Um flag nunca bloqueia função local.
 */
import { getFlags, getLocalePref, setFlags, type FlagCache } from '../data/meta'
import { setLocale, SUPPORTED_LOCALES, type Locale } from '../i18n'
import { apiJson } from '../net/auth-client'

const REFRESH_MS = 15 * 60_000

interface FlagResponse {
  flags?: Record<string, unknown>
  locales?: string[]
}

function forcedLocales(): Locale[] {
  const raw = import.meta.env.VITE_FORCE_LOCALES
  if (typeof raw !== 'string') return []
  return SUPPORTED_LOCALES.filter((locale) =>
    raw
      .split(',')
      .map((item) => item.trim())
      .includes(locale),
  )
}

/** Valida a resposta: nunca aceita chaves ou idiomas arbitrários do servidor. */
export function normalizeFlags(value: FlagResponse): FlagCache {
  const flags = {
    i18n_en: value.flags?.i18n_en === true,
    i18n_es: value.flags?.i18n_es === true,
  }
  const locales = SUPPORTED_LOCALES.filter(
    (locale) => locale === 'pt-BR' || (value.locales ?? []).includes(locale),
  )
  const forced = forcedLocales()
  if (forced.length === 0) return { flags, locales }
  return {
    flags: {
      i18n_en: forced.includes('en-US') || flags.i18n_en,
      i18n_es: forced.includes('es-419') || flags.i18n_es,
    },
    locales: forced,
  }
}

export async function getCachedFlags(): Promise<FlagCache> {
  return normalizeFlags(await getFlags())
}

/** Em falha de rede devolve o último resultado; sem nenhum, só pt-BR. */
export async function refreshFlags(): Promise<FlagCache> {
  try {
    const response = await apiJson<FlagResponse>(
      '/api/v1/flags',
      {},
      {
        auth: false,
        attachToken: true,
      },
    )
    const value = normalizeFlags(response)
    await setFlags(value)
    return value
  } catch {
    return getCachedFlags()
  }
}

/** A preferência salva não muda: se o flag desligou, só o idioma efetivo volta ao padrão. */
export async function applyLocaleFromFlags(value?: FlagCache): Promise<Locale> {
  const flags = value ?? (await getCachedFlags())
  const saved = (await getLocalePref()) ?? localStorage.getItem('emagreser.locale')
  const locale: Locale =
    saved !== null && flags.locales.includes(saved as Locale) ? (saved as Locale) : 'pt-BR'
  await setLocale(locale)
  return locale
}

export async function onSessionReady(): Promise<void> {
  await applyLocaleFromFlags(await refreshFlags())
}

export function startFlags(): () => void {
  void onSessionReady()
  const onVisible = () => {
    if (globalThis.document?.visibilityState === 'visible') void onSessionReady()
  }
  globalThis.document?.addEventListener?.('visibilitychange', onVisible)
  const interval = setInterval(() => void onSessionReady(), REFRESH_MS)
  return () => {
    globalThis.document?.removeEventListener?.('visibilitychange', onVisible)
    clearInterval(interval)
  }
}
