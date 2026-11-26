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
