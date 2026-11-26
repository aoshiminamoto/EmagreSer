import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { getFlags, setLocalePref } from '../data/meta'
import { saveSettings } from '../data/settings'
import { applyLocaleFromFlags, getCachedFlags, normalizeFlags, refreshFlags } from './client'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.stubGlobal('document', { documentElement: { lang: 'pt-BR' } })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => response({ error: 'NETWORK_ERROR' }, 503)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('cliente de feature flags', () => {
  it('sem cache considera tudo desligado e só pt-BR', async () => {
    expect(await getCachedFlags()).toEqual({
      flags: { i18n_en: false, i18n_es: false },
      locales: ['pt-BR'],
    })
  })

  it('ignora chaves e idiomas desconhecidos devolvidos pelo servidor', () => {
    expect(
      normalizeFlags({
        flags: { i18n_en: true, i18n_es: 'sim', other: true },
        locales: ['pt-BR', 'en-US', 'xx-XX'],
      }),
    ).toEqual({ flags: { i18n_en: true, i18n_es: false }, locales: ['pt-BR', 'en-US'] })
  })

  it('guarda o resultado e o reusa sem rede', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        response({ flags: { i18n_en: true, i18n_es: false }, locales: ['pt-BR', 'en-US'] }),
      ),
    )

    expect(await refreshFlags()).toMatchObject({ flags: { i18n_en: true } })
    expect(await getFlags()).toMatchObject({ locales: ['pt-BR', 'en-US'] })

    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('offline')
      }),
    )
    expect(await refreshFlags()).toMatchObject({ flags: { i18n_en: true } })
  })

  it('VITE_FORCE_LOCALES ignora os flags em dev e em teste', async () => {
    vi.stubEnv('VITE_FORCE_LOCALES', 'pt-BR, en-US, es-419')
    expect(await getCachedFlags()).toEqual({
      flags: { i18n_en: true, i18n_es: true },
      locales: ['pt-BR', 'en-US', 'es-419'],
    })
  })
})

describe('resolução do idioma (RN-15)', () => {
  const available = normalizeFlags({
    flags: { i18n_en: true, i18n_es: true },
    locales: ['pt-BR', 'en-US', 'es-419'],
  })

  beforeEach(() => {
    vi.stubGlobal('navigator', { languages: ['es-MX', 'pt-BR'] })
  })

  it('user_settings.locale vence quando o onboarding foi concluído', async () => {
    await saveSettings({ onboardingDone: true, locale: 'en-US' })
    await setLocalePref('es-419')
    expect(await applyLocaleFromFlags(available)).toBe('en-US')
  })

  it('a preferência salva vale antes do onboarding', async () => {
    await saveSettings({ onboardingDone: false, locale: 'pt-BR' })
    await setLocalePref('es-419')
    expect(await applyLocaleFromFlags(available)).toBe('es-419')
  })

  it('sem preferência usa o navegador e respeita flag desligado', async () => {
    expect(await applyLocaleFromFlags(available)).toBe('es-419')
    expect(await applyLocaleFromFlags(normalizeFlags({ flags: {}, locales: ['pt-BR'] }))).toBe(
      'pt-BR',
    )
  })
})
