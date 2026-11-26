import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/db'
import { listOutbox } from '../../data/outbox'
import { listWeightEntries } from '../../data/weights'
import { onPesoEvent } from './events'
import { registerWeight, removeWeight, updateWeight } from './records'

const now = new Date('2026-11-26T10:00:00.000Z')

describe('escrita de peso', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('publica os pontos de extensão e só anuncia acolhimento na subida', async () => {
    const saved = vi.fn()
    const mood = vi.fn()
    const welcome = vi.fn()
    const milestone = vi.fn()
    const unsubscribe = [
      onPesoEvent('weight:saved', saved),
      onPesoEvent('mood:prompt', mood),
      onPesoEvent('welcome:prompt', welcome),
      onPesoEvent('milestone:evaluate', milestone),
    ]
    try {
      await registerWeight({ date: '2026-11-26', weightKg: 70 }, now)
      expect(saved).toHaveBeenCalledOnce()
      expect(mood).toHaveBeenCalledOnce()
      expect(milestone).toHaveBeenCalledOnce()
      expect(welcome).not.toHaveBeenCalled()

      await registerWeight({ date: '2026-11-27', weightKg: 71 }, now)
      expect(welcome).toHaveBeenCalledOnce()
    } finally {
      for (const off of unsubscribe) off()
    }
  })

  it('editar trocando a data mantém o id e apagar grava tombstone na fila', async () => {
    const created = await registerWeight({ date: '2026-11-26', weightKg: 70 }, now)
    const edited = await updateWeight(created.id, { date: '2026-11-25', weightKg: 69.5 }, now)

    expect(edited.id).toBe(created.id)
    expect(await listWeightEntries()).toMatchObject([{ date: '2026-11-25', weightKg: 69.5 }])
    expect((await listOutbox()).map((item) => item.op)).toEqual(['upsert', 'upsert'])

    await removeWeight(created.id, now)
    expect(await listWeightEntries()).toEqual([])
    expect((await listOutbox()).map((item) => item.op)).toEqual(['upsert', 'upsert', 'delete'])
  })
})
