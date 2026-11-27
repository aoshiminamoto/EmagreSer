import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { listOutbox } from './outbox'
import {
  deleteWeightEntry,
  editWeightEntry,
  getWeightEntry,
  listWeightEntries,
  putWeightEntry,
  setWeightMood,
  WeightDateConflictError,
  WeightEntryNotFoundError,
} from './weights'

const first = new Date('2026-11-26T10:00:00.000Z')
const second = new Date('2026-11-26T12:00:00.000Z')

describe('repositório de peso', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('gera id UUID v4 no cliente e grava updatedAt', async () => {
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70.2 }, first)

    expect(entry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(entry.updatedAt).toBe(first.toISOString())
  })

  it('faz upsert por data: uma edição mantém o id e não duplica o peso', async () => {
    const created = await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, first)
    const edited = await putWeightEntry({ date: '2026-11-26', weightKg: 69.5 }, second)

    expect(edited.id).toBe(created.id)
    expect(await getWeightEntry('2026-11-26')).toMatchObject({ weightKg: 69.5 })
    expect(await listWeightEntries()).toHaveLength(1)
    expect(await listOutbox()).toHaveLength(2)
  })

  it('exclui por tombstone e mantém a exclusão na fila', async () => {
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, first)
    await deleteWeightEntry(entry.id, second)

    expect(await getWeightEntry('2026-11-26')).toBeUndefined()
    expect(await listWeightEntries()).toEqual([])
    expect(await db.weightEntries.get(entry.id)).toMatchObject({
      deleted: true,
      updatedAt: second.toISOString(),
    })
    expect(await listOutbox()).toMatchObject([{}, { op: 'delete', id: entry.id }])
  })

  it('edita mantendo o id ao trocar a data e recusa data já ocupada', async () => {
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70, note: 'leve' }, first)
    await putWeightEntry({ date: '2026-11-25', weightKg: 71 }, first)

    const edited = await editWeightEntry(
      entry.id,
      { date: '2026-11-24', weightKg: 69.5, note: 'bem' },
      second,
    )

    expect(edited.id).toBe(entry.id)
    expect(edited).toMatchObject({ date: '2026-11-24', weightKg: 69.5, note: 'bem' })
    expect(await getWeightEntry('2026-11-26')).toBeUndefined()
    await expect(
      editWeightEntry(entry.id, { date: '2026-11-25', weightKg: 68 }, second),
    ).rejects.toBeInstanceOf(WeightDateConflictError)
    await expect(
      editWeightEntry('inexistente', { date: '2026-11-24', weightKg: 68 }, second),
    ).rejects.toBeInstanceOf(WeightEntryNotFoundError)
  })

  it('grava o humor escolhido após salvar e mantém o registro na fila', async () => {
    const entry = await putWeightEntry({ date: '2026-11-26', weightKg: 70, note: 'leve' }, first)
    await setWeightMood(entry.id, 'feliz', second)

    expect(await getWeightEntry('2026-11-26')).toMatchObject({
      mood: 'feliz',
      note: 'leve',
      updatedAt: second.toISOString(),
    })
    expect(await listOutbox()).toMatchObject([
      {},
      { entity: 'weight_entries', op: 'upsert', data: { mood: 'feliz' } },
    ])
    await expect(setWeightMood('inexistente', 'feliz', second)).rejects.toBeInstanceOf(
      WeightEntryNotFoundError,
    )
  })

  it('permite recriar um peso na mesma data depois da exclusão', async () => {
    const old = await putWeightEntry({ date: '2026-11-26', weightKg: 70 }, first)
    await deleteWeightEntry(old.id, second)
    const fresh = await putWeightEntry({ date: '2026-11-26', weightKg: 71 }, second)

    expect(fresh.id).not.toBe(old.id)
    expect(await listWeightEntries()).toHaveLength(1)
  })
})
