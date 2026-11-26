import type { WritableComputedRef } from 'vue'
import { createI18n } from 'vue-i18n'
import ptBR from './locales/pt-BR.json'

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-419'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: { 'pt-BR': ptBR },
})

/** RN-15: prefixo do navegador para o locale do app. */
export function browserLocales(languages?: readonly string[]): Locale[] {
  const values = languages ?? globalThis.navigator?.languages ?? []
  const found: Locale[] = []
  for (const value of values) {
    const prefix = value.split('-')[0]?.toLowerCase()
    const locale =
      prefix === 'pt' ? 'pt-BR' : prefix === 'en' ? 'en-US' : prefix === 'es' ? 'es-419' : undefined
    if (locale !== undefined && !found.includes(locale)) found.push(locale)
  }
  return found
}

const loaded = new Set<Locale>(['pt-BR'])

const loaders: Record<Exclude<Locale, 'pt-BR'>, () => Promise<{ default: typeof ptBR }>> = {
  'en-US': () => import('./locales/en-US.json'),
  'es-419': () => import('./locales/es-419.json'),
}

// O catálogo ativo é carregado sob demanda; os três estão no precache do service worker.
export async function setLocale(locale: Locale): Promise<void> {
  if (locale !== 'pt-BR' && !loaded.has(locale)) {
    const catalog = await loaders[locale]()
    i18n.global.setLocaleMessage(locale, catalog.default)
    loaded.add(locale)
  }
  ;(i18n.global.locale as WritableComputedRef<Locale>).value = locale
  document.documentElement.lang = locale
}
