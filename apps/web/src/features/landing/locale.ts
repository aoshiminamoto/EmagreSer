/**
 * RF-81: idioma da landing sem login. Não há IndexedDB nem chamada a /flags ou
 * /auth na landing (RN-13): valem a preferência salva no navegador, os idiomas
 * liberados por VITE_FORCE_LOCALES (flags "on") e o navegador, nessa ordem.
 */
import { browserLocales, i18n, setLocale, SUPPORTED_LOCALES, type Locale } from '../../i18n'
import { landingOrigin } from './origin'

const LOCALE_PREF_KEY = 'emagreser.locale'

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

function savedPreference(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(LOCALE_PREF_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function resolveLandingLocale(
  saved: string | undefined,
  languages: readonly string[] | undefined,
  forced: readonly Locale[],
): Locale {
  const available: Locale[] = ['pt-BR', ...forced.filter((locale) => locale !== 'pt-BR')]
  const candidates = [saved, ...browserLocales(languages)]
  for (const candidate of candidates) {
    const match = available.find((locale) => locale === candidate)
    if (match !== undefined) return match
  }
  return 'pt-BR'
}

function setMeta(selector: string, attribute: string, content: string): void {
  const element = globalThis.document?.head?.querySelector(selector)
  if (element !== null && element !== undefined) element.setAttribute(attribute, content)
}

export async function applyLandingLocale(): Promise<Locale> {
  const locale = resolveLandingLocale(
    savedPreference(),
    globalThis.navigator?.languages,
    forcedLocales(),
  )
  await setLocale(locale)
  const t = i18n.global.t
  globalThis.document.title = t('landing.meta.title')
  setMeta('meta[name="description"]', 'content', t('landing.meta.description'))
  setMeta('meta[property="og:title"]', 'content', t('landing.meta.ogTitle'))
  setMeta('meta[property="og:description"]', 'content', t('landing.meta.ogDescription'))
  setMeta('meta[property="og:type"]', 'content', 'website')
  setMeta('meta[property="og:url"]', 'content', landingOrigin())
  setMeta('meta[property="og:locale"]', 'content', locale)
  if (globalThis.document !== undefined) globalThis.document.documentElement.lang = locale
  return locale
}
