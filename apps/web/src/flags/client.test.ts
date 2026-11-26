import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { getFlags } from '../data/meta'
import { getCachedFlags, normalizeFlags, refreshFlags } from './client'

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
