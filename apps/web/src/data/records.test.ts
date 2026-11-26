import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { findHabitByKey, putHabit, seedDefaultHabits } from './habits'
import { getHabitLog, listHabitLogsByDate, putHabitLog } from './habitLogs'
import { listMilestones, putMilestone, setCelebrated } from './milestones'
import { listOutbox } from './outbox'
import { getWaterLog, putWaterLog } from './waterLogs'

const now = new Date('2026-11-26T10:00:00.000Z')

describe('repositórios de hábitos e registros', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('sempre os três hábitos padrão, sem repetir a fila na segunda chamada', async () => {
    const first = await seedDefaultHabits(now)
    const outboxAfterFirst = await listOutbox()
    const second = await seedDefaultHabits(now)

    expect(first.map((habit) => habit.key)).toEqual(['vegetais', 'sono', 'exercicio'])
    expect(first.every((habit) => habit.label === undefined)).toBe(true)
    expect(second.map((habit) => habit.id)).toEqual(first.map((habit) => habit.id))
    expect(await listOutbox()).toHaveLength(outboxAfterFirst.length)
  })

  it('um hábito por chave e um log por (data, hábito)', async () => {
    const habit = await putHabit({ key: 'leitura', label: 'Ler' }, now)
    const edited = await putHabit({ key: 'leitura', label: 'Ler 20 min' }, now)
    expect(edited.id).toBe(habit.id)
    expect(await findHabitByKey('leitura')).toMatchObject({ label: 'Ler 20 min' })

    const log = await putHabitLog({ date: '2026-11-26', habitId: habit.id }, now)
    const editedLog = await putHabitLog({ date: '2026-11-26', habitId: habit.id, done: false }, now)
    expect(editedLog.id).toBe(log.id)
    expect(await getHabitLog('2026-11-26', habit.id)).toMatchObject({ done: false })

    const otherHabit = await putHabit({ key: 'caminhada' }, now)
    await putHabitLog({ date: '2026-11-26', habitId: otherHabit.id }, now)
    expect(await listHabitLogsByDate('2026-11-26')).toHaveLength(2)
  })

  it('um registro de água por data, com atualização do id', async () => {
    const created = await putWaterLog({ date: '2026-11-26', glasses: 3 }, now)
    const edited = await putWaterLog({ date: '2026-11-26', glasses: 5 }, now)

    expect(edited.id).toBe(created.id)
    expect(await getWaterLog('2026-11-26')).toMatchObject({ glasses: 5 })
  })

  it('um marco por quilo e celebração sem sair do aparelho', async () => {
    const milestone = await putMilestone({ milestoneKg: 2 }, now)
    const outboxBefore = await listOutbox()
    await setCelebrated(milestone.id, true)

    expect(await listOutbox()).toHaveLength(outboxBefore.length)
    expect(await listMilestones()).toEqual([
      expect.objectContaining({ id: milestone.id, celebrated: true }),
    ])
    expect(await putMilestone({ milestoneKg: 2, achievedDate: '2026-11-26' }, now)).toMatchObject({
      id: milestone.id,
      celebrated: true,
    })
  })
})
