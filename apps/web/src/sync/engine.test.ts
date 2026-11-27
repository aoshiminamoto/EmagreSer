import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { getLastPullCursor } from '../data/meta'
import { listOutbox } from '../data/outbox'
import { saveSettings } from '../data/settings'
import { getWeightEntry, putWeightEntry } from '../data/weights'
import { clearSession, setSession } from '../net/auth-client'
import { backoffDelay, runSync, withSyncLock } from './engine'
import { getSyncState } from './status'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const started = new Date('2026-11-26T10:00:00.000Z')
type Responder = (url: string, init?: RequestInit) => Response | Promise<Response>
let responder: Responder

beforeEach(async () => {
  await db.delete()
  await db.open()
  setSession({ accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 })
  responder = () => response({ applied: [], conflicts: [], cursor: 0 })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => responder(String(input), init)),
  )
})

afterEach(() => {
  clearSession()
  vi.unstubAllGlobals()
})

describe('motor de sincronização', () => {
  it('envia três pesos offline em um lote, sem duplicar, e limpa a fila', async () => {
    await putWeightEntry({ date: '2026-11-24', weightKg: 70.4 }, started)
    await putWeightEntry({ date: '2026-11-25', weightKg: 70.1 }, started)
    await putWeightEntry({ date: '2026-11-26', weightKg: 69.8 }, started)
    let pushed:
      | {
          changes: Array<{ entity: string; id: string; data: Record<string, unknown> }>
        }
      | undefined
    responder = (url, init) => {
      if (url.includes('/sync/push')) {
        pushed = JSON.parse(String(init?.body)) as typeof pushed
        return response({
          applied: pushed?.changes.map((change, index) => ({
            entity: change.entity,
            id: change.id,
            changeSeq: index + 1,
          })),
          conflicts: [],
          cursor: 3,
        })
      }
      return response({ changes: [], nextCursor: 0, hasMore: false })
    }

    expect(await runSync()).toBe(true)
    expect(pushed?.changes).toHaveLength(3)
    expect(pushed?.changes.map((change) => change.data.date)).toEqual([
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
    ])
    expect(pushed?.changes.every((change) => change.entity === 'weight_entries')).toBe(true)
    expect(await listOutbox()).toEqual([])
    expect(getSyncState().status).toBe('synced')
  })

  it('aceita id por lote de 200 e percorre o pull enquanto houver mais páginas', async () => {
    await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, started)
    const pages: number[] = []
    responder = (url, init) => {
      if (url.includes('/sync/push')) {
        const body = JSON.parse(String(init?.body)) as {
          changes: Array<{ entity: string; id: string }>
        }
        return response({
          applied: body.changes.map((change, index) => ({
            entity: change.entity,
            id: change.id,
            changeSeq: index + 1,
          })),
          conflicts: [],
          cursor: 1,
        })
      }
      if (url.includes('/sync/pull')) {
        const cursor = Number(new URL(`http://local${url}`).searchParams.get('cursor'))
        pages.push(cursor)
        if (cursor === 0) {
          return response({
            changes: [
              {
                entity: 'water_logs',
                id: 'c8a1a5b2-1111-4111-8111-111111111111',
                op: 'upsert',
                data: { date: '2026-11-25', glasses: 6 },
                clientUpdatedAt: '2026-11-25T10:00:00.000Z',
                changeSeq: 10,
                deletedAt: null,
              },
            ],
            nextCursor: 10,
            hasMore: true,
          })
        }
        return response({ changes: [], nextCursor: 10, hasMore: false })
      }
      return response({})
    }

    expect(await runSync()).toBe(true)
    expect(pages).toEqual([0, 10])
    expect(await getLastPullCursor()).toBe(10)
    expect(await db.waterLogs.toArray()).toMatchObject([{ glasses: 6 }])
  })

  it('uma alteração local mais nova vence o pull e permanece na fila', async () => {
    const local = await putWeightEntry({ date: '2026-11-26', weightKg: 71 }, started)
    responder = () =>
      response({
        changes: [
          {
            entity: 'weight_entries',
            id: local.id,
            op: 'upsert',
            data: { date: '2026-11-26', weight_kg: 68 },
            clientUpdatedAt: '2026-11-26T09:00:00.000Z',
            changeSeq: 20,
            deletedAt: null,
          },
        ],
        nextCursor: 20,
        hasMore: false,
      })

    await runSync()
    expect(await getWeightEntry('2026-11-26')).toMatchObject({ weightKg: 71 })
    expect(await listOutbox()).toHaveLength(1)
  })

  it('limpar a altura do IMC envia null ao servidor (RF-62)', async () => {
    await saveSettings({ heightCm: 170, bmiVisible: true }, started)
    await saveSettings({ heightCm: null, bmiVisible: false }, started)
    let pushed:
      { changes: Array<{ entity: string; id: string; data: Record<string, unknown> }> } | undefined
    responder = (url, init) => {
      if (url.includes('/sync/push')) {
        pushed = JSON.parse(String(init?.body)) as typeof pushed
        return response({
          applied: pushed?.changes.map((change, index) => ({
            entity: change.entity,
            id: change.id,
            changeSeq: index + 1,
          })),
          conflicts: [],
          cursor: 1,
        })
      }
      return response({ changes: [], nextCursor: 1, hasMore: false })
    }

    expect(await runSync()).toBe(true)
    const changes = (pushed?.changes ?? []).filter((change) => change.entity === 'settings')
    expect(changes.at(-1)?.data).toMatchObject({ height_cm: null, bmi_visible: false })
  })

  it('falha 401 preserva a fila e os dados locais', async () => {
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, started)
    responder = (url) => {
      if (url.includes('/refresh') || url.includes('/sync/push')) {
        return response({ error: 'UNAUTHORIZED' }, 401)
      }
      return response({ changes: [], nextCursor: 0, hasMore: false })
    }

    expect(await runSync()).toBe(false)
    expect(await listOutbox()).toHaveLength(1)
    expect(await getWeightEntry('2026-11-26')).toMatchObject({ id: entry.id, weightKg: 70 })
    expect(getSyncState()).toMatchObject({ status: 'pending', authRequired: true })
  })

  it('usa a Web Locks API com o nome da fila e tem trava local por aba', async () => {
    const request = vi.fn(async (_name: string, task: () => Promise<string>) => task())
    vi.stubGlobal('navigator', { onLine: true, locks: { request } })

    responder = () => response({ changes: [], nextCursor: 0, hasMore: false })
    await runSync()
    expect(request).toHaveBeenCalledWith('emagreser-sync', expect.any(Function))

    vi.stubGlobal('navigator', { onLine: true })
    let release!: () => void
    const first = withSyncLock(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve('first')
        }),
    )
    expect(await withSyncLock(async () => 'segunda')).toBeUndefined()
    release()
    expect(await first).toBe('first')
  })

  it('a espera crescente vai de 2 s a 5 min', () => {
    expect([0, 1, 2, 3, 20].map(backoffDelay)).toEqual([2000, 4000, 8000, 16000, 300000])
  })
})
