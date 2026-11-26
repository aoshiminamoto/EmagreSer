import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_VERSION, db, schemaV1, schemaV2 } from './db'
import { listOutbox } from './outbox'
import { putWeightEntry } from './weights'

const migratedName = 'emagreser-migracao-teste'

describe('schema do IndexedDB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.close()
  })

  it('cria todas as stores e os índices da versão atual', () => {
    expect(db.verno).toBe(CURRENT_VERSION)
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      [
        'habitLogs',
        'habits',
        'meta',
        'milestones',
        'outbox',
        'progressPhotos',
        'settings',
        'waterLogs',
        'weightEntries',
      ].sort(),
    )
    expect(schemaV2.weightEntries).toBe('id, date, updatedAt')
    expect(schemaV2.outbox).toBe('++seq, entity, id')
    expect(schemaV2.progressPhotos).toBe('id, date, angle')
  })

  it('preserva os dados ao migrar de v1 para v2 e habilita os novos índices', async () => {
    const oldDb = new Dexie(migratedName)
    oldDb.version(1).stores(schemaV1)
    await oldDb.open()
    const updatedAt = new Date('2026-11-26T10:00:00.000Z').toISOString()
    await oldDb.table('weightEntries').add({
      id: 'w-antigo',
      date: '2026-11-26',
      weightKg: 70,
      updatedAt,
    })
    await oldDb.table('outbox').add({
      entity: 'weight_entries',
      id: 'w-antigo',
      op: 'upsert',
      data: {},
      clientUpdatedAt: updatedAt,
    })
    oldDb.close()

    const upgraded = new Dexie(migratedName)
    upgraded.version(1).stores(schemaV1)
    upgraded.version(2).stores(schemaV2)
    await upgraded.open()

    expect(upgraded.verno).toBe(CURRENT_VERSION)
    expect(await upgraded.table('weightEntries').get('w-antigo')).toMatchObject({ weightKg: 70 })
    expect(await upgraded.table('weightEntries').where('updatedAt').equals(updatedAt).count()).toBe(
      1,
    )
    expect(await upgraded.table('outbox').where('id').equals('w-antigo').count()).toBe(1)
    expect(await upgraded.table('progressPhotos').count()).toBe(0)

    upgraded.close()
    await upgraded.delete()
  })

  it('grava dado e outbox juntos: falha na fila não deixa registro pela metade', async () => {
    vi.spyOn(db.outbox, 'add').mockRejectedValueOnce(new Error('falha simulada'))

    await expect(putWeightEntry({ date: '2026-11-26', weightKg: 70 })).rejects.toThrow(
      'falha simulada',
    )
    expect(await db.weightEntries.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
  })

  it('registra entity, id, op e clientUpdatedAt na fila', async () => {
    const now = new Date('2026-11-26T10:00:00.000Z')
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, now)
    const items = await listOutbox()

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      entity: 'weight_entries',
      id: entry.id,
      op: 'upsert',
      clientUpdatedAt: now.toISOString(),
    })
  })
})
