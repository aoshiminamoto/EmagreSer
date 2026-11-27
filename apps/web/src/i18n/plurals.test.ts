import type { WritableComputedRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US.json'
import es419 from './locales/es-419.json'
import ptBR from './locales/pt-BR.json'

const locales = ['pt-BR', 'en-US', 'es-419'] as const
const counts = [0, 1, 2, 10]

const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  messages: { 'pt-BR': ptBR, 'en-US': enUS, 'es-419': es419 },
})

function useLocale(locale: (typeof locales)[number]): void {
  ;(i18n.global.locale as WritableComputedRef<string>).value = locale
}

function pluralByLocale(key: string): Record<string, string[]> {
  return Object.fromEntries(
    locales.map((locale) => {
      useLocale(locale)
      return [locale, counts.map((count) => i18n.global.t(key, { count }))]
    }),
  )
}

function indicatorsByLocale(): Record<string, string> {
  return Object.fromEntries(
    locales.map((locale) => {
      useLocale(locale)
      const unit = i18n.global.t('water.cup', { count: 8 })
      return [locale, i18n.global.t('water.indicator', { count: 3, goal: 8, unit })]
    }),
  )
}

describe('plurais por idioma (RF-77)', () => {
  it('dias de streak', () => {
    expect(pluralByLocale('streak.days')).toMatchInlineSnapshot(`
      {
        "en-US": [
          "0 days in a row",
          "1 day in a row",
          "2 days in a row",
          "10 days in a row",
        ],
        "es-419": [
          "0 días seguidos",
          "1 día seguido",
          "2 días seguidos",
          "10 días seguidos",
        ],
        "pt-BR": [
          "0 dias seguidos",
          "1 dia seguido",
          "2 dias seguidos",
          "10 dias seguidos",
        ],
      }
    `)
  })

  it('recorde de streak', () => {
    expect(pluralByLocale('streak.best')).toMatchInlineSnapshot(`
      {
        "en-US": [
          "Best: 0 days",
          "Best: 1 day",
          "Best: 2 days",
          "Best: 10 days",
        ],
        "es-419": [
          "Récord: 0 días",
          "Récord: 1 día",
          "Récord: 2 días",
          "Récord: 10 días",
        ],
        "pt-BR": [
          "Recorde: 0 dias",
          "Recorde: 1 dia",
          "Recorde: 2 dias",
          "Recorde: 10 dias",
        ],
      }
    `)
  })

  it('copos concordam com a meta', () => {
    expect(pluralByLocale('water.cup')).toMatchInlineSnapshot(`
      {
        "en-US": [
          "glasses",
          "glass",
          "glasses",
          "glasses",
        ],
        "es-419": [
          "vasos",
          "vaso",
          "vasos",
          "vasos",
        ],
        "pt-BR": [
          "copos",
          "copo",
          "copos",
          "copos",
        ],
      }
    `)
    expect(indicatorsByLocale()).toMatchInlineSnapshot(`
      {
        "en-US": "3 of 8 glasses",
        "es-419": "3 de 8 vasos",
        "pt-BR": "3 de 8 copos",
      }
    `)
  })
})
