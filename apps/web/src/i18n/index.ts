import type { WritableComputedRef } from 'vue'
import { createI18n, type LocaleMessageValue } from 'vue-i18n'
import { en as vuetifyEn, es as vuetifyEs, pt as vuetifyPt } from 'vuetify/locale'
import ptBR from './locales/pt-BR.json'

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-419'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

// O adaptador do Vuetify lê os textos internos (seletor de data, acessibilidade)
// de $vuetify no catálogo ativo; sem eles aparecem as chaves cruas.
const vuetifyMessages: Record<Locale, LocaleMessageValue> = {
  'pt-BR': vuetifyPt,
  'en-US': vuetifyEn,
  'es-419': vuetifyEs,
}

function withVuetify<T extends object>(catalog: T, locale: Locale): T {
  return { ...catalog, $vuetify: vuetifyMessages[locale] }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: { 'pt-BR': withVuetify(ptBR, 'pt-BR') },
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
    i18n.global.setLocaleMessage(locale, withVuetify(catalog.default, locale))
    loaded.add(locale)
  }
  ;(i18n.global.locale as WritableComputedRef<Locale>).value = locale
  document.documentElement.lang = locale
}
