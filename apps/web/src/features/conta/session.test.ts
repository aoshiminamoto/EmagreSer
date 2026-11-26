import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../bootstrap', () => ({ onLogin: vi.fn(async () => undefined) }))
vi.mock('../../flags/client', () => ({
  applyLocaleFromFlags: vi.fn(async () => 'pt-BR'),
  offlineFlags: () => ({ flags: { i18n_en: false, i18n_es: false }, locales: ['pt-BR'] }),
}))

import { db } from '../../data/db'
import { getMeta, setMeta } from '../../data/meta'
import { putWeightEntry } from '../../data/weights'
import { putProgressPhoto } from '../../data/photos'
import { clearSession, resetAuthClientForTests } from '../../net/auth-client'
import { restoreSession, resetSessionForTests, signOut } from './session'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const token = { accessToken: 'token-de-teste', tokenType: 'Bearer', expiresIn: 3600 }

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearSession()
  resetAuthClientForTests()
  resetSessionForTests()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const path = String(input)
      if (path.includes('refresh')) return response(token)
      return response({ ok: true })
    }),
  )
})

describe('sessão persistente (RF-48)', () => {
  it('sem marca local não restaura sessão', async () => {
    expect(await restoreSession()).toBe(false)
  })

  it('renova o cookie no arranque quando há marca', async () => {
    await setMeta('sessionActive', true)
    expect(await restoreSession()).toBe(true)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), expect.anything())
  })

  it('sem rede mantém a marca e abre o app', async () => {
    await setMeta('sessionActive', true)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('offline')
      }),
    )
    expect(await restoreSession()).toBe(true)
  })

  it('refresh com 401 encerra a sessão local sem apagar os dados', async () => {
    await setMeta('sessionActive', true)
    await putWeightEntry({ date: '2026-11-26', weightKg: 80 }, new Date())
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response({ error: 'INVALID_REFRESH_TOKEN' }, 401)),
    )
    expect(await restoreSession()).toBe(false)
    expect(await getMeta('sessionActive')).toBe(false)
    expect(await db.weightEntries.count()).toBe(1)
  })

  it('sair apaga fila, pesos e fotos depois da confirmação', async () => {
    await setMeta('sessionActive', true)
    await putWeightEntry({ date: '2026-11-26', weightKg: 80 }, new Date())
    await putProgressPhoto({
      date: '2026-11-26',
      angle: 'front',
      blob: new Blob(['foto'], { type: 'image/jpeg' }),
    })
    expect(await db.outbox.count()).toBeGreaterThan(0)

    await signOut()

    expect(await db.weightEntries.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    expect(await db.progressPhotos.count()).toBe(0)
    expect(await getMeta('sessionActive')).toBeUndefined()
    expect(await restoreSession()).toBe(false)
  })
})
