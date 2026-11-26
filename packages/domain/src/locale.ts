/**
 * RN-15: resolução pura do idioma efetivo. Flags são recebidas por parâmetro;
 * a preferência salva nunca é alterada quando o flag está desligado.
 */
export const LOCALES = ['pt-BR', 'en-US', 'es-419'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'

/** Mapa chaveado por locale; a camada de flags mapeia i18n_en/i18n_es. */
export type LocaleFlags = Partial<Record<Locale, boolean>>

export interface LocalePreferences {
  userLocale?: string | null
  preLoginLocale?: string | null
  browserLanguages?: readonly string[] | null
}

function supportedLocale(candidate: string | null | undefined): Locale | null {
  return LOCALES.find((locale) => locale === candidate) ?? null
}

function fromBrowserLanguage(language: string): Locale | null {
  const prefix = language.trim().slice(0, 2).toLowerCase()
  if (prefix === 'pt') return 'pt-BR'
  if (prefix === 'en') return 'en-US'
  if (prefix === 'es') return 'es-419'
  return null
}

function isAvailable(locale: Locale, flags: LocaleFlags): boolean {
  // pt-BR é o padrão do produto e não depende de feature flag.
  return locale === DEFAULT_LOCALE || flags[locale] === true
}

export function resolveLocale(preferences: LocalePreferences, flags: LocaleFlags): Locale {
  const candidates: Locale[] = []
  const saved = supportedLocale(preferences.userLocale)
  const preLogin = supportedLocale(preferences.preLoginLocale)
  if (saved !== null) candidates.push(saved)
  if (preLogin !== null) candidates.push(preLogin)
  for (const language of preferences.browserLanguages ?? []) {
    const locale = fromBrowserLanguage(language)
    if (locale !== null) candidates.push(locale)
  }

  return candidates.find((locale) => isAvailable(locale, flags)) ?? DEFAULT_LOCALE
}
