import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { getHabitLog } from '../../data/habitLogs'
import { listHabits, seedDefaultHabits } from '../../data/habits'
import { getMeta } from '../../data/meta'
import { listOutbox } from '../../data/outbox'
import { getWaterLog } from '../../data/waterLogs'
import type { StreakSnapshot } from '../../sync/recalc'
import {
  addCustomHabit,
  changeWaterGlasses,
  MAX_HABITS,
  removeCustomHabit,
  setHabitActive,
  toggleHabitLog,
} from './actions'

const now = new Date('2026-11-26T12:00:00.000Z')
const today = '2026-11-26'
const yesterday = '2026-11-25'

function streak(): Promise<StreakSnapshot | undefined> {
  return getMeta<StreakSnapshot>('streak')
}

describe('ações de hábitos e água (RF-21/RF-23/RF-24)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('marcar e desmarcar grava na fila e atualiza o dia ativo', async () => {
    const [habit] = await seedDefaultHabits(now)
    if (habit === undefined) throw new Error('hábito padrão ausente')

    expect(await toggleHabitLog(habit.id, today, now)).toBe(true)
    expect(await getHabitLog(today, habit.id)).toMatchObject({ done: true })
    expect(await listOutbox()).toHaveLength(4)
    expect(await listOutbox()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: 'habits', op: 'upsert' }),
        expect.objectContaining({ entity: 'habit_logs', op: 'upsert' }),
      ]),
    )
    expect(await streak()).toEqual({ current: 1, best: 1 })

    expect(await toggleHabitLog(habit.id, today, now)).toBe(false)
    expect(await getHabitLog(today, habit.id)).toMatchObject({ done: false })
    expect(await streak()).toEqual({ current: 0, best: 1 })
  })

  it('cada dia tem seu próprio registro e o streak soma dias seguidos', async () => {
    const [habit] = await seedDefaultHabits(now)
    if (habit === undefined) throw new Error('hábito padrão ausente')

    await toggleHabitLog(habit.id, yesterday, now)
    await toggleHabitLog(habit.id, today, now)
    expect(await getHabitLog(yesterday, habit.id)).toMatchObject({ done: true })
    expect(await getHabitLog(today, habit.id)).toMatchObject({ done: true })
    expect(await streak()).toEqual({ current: 2, best: 2 })
  })

  it('a água nunca fica negativa e voltar a zero não conta como ação', async () => {
    expect(await changeWaterGlasses(-1, today, now)).toBe(0)
    expect(await listOutbox()).toHaveLength(0)

    expect(await changeWaterGlasses(2, today, now)).toBe(2)
    expect(await getWaterLog(today)).toMatchObject({ glasses: 2 })
    expect(await streak()).toEqual({ current: 1, best: 1 })

    expect(await changeWaterGlasses(-1, today, now)).toBe(1)
    await changeWaterGlasses(-1, today, now)
    expect(await getWaterLog(today)).toBeUndefined()
    expect(await listOutbox()).toEqual([
      expect.objectContaining({ entity: 'water_logs', op: 'upsert' }),
      expect.objectContaining({ entity: 'water_logs', op: 'upsert' }),
      expect.objectContaining({ entity: 'water_logs', op: 'delete' }),
    ])
    expect(await streak()).toEqual({ current: 0, best: 1 })
  })

  it('preserva o recorde quando o dia atual fica sem ação', async () => {
    await changeWaterGlasses(1, '2026-11-22', now)
    await changeWaterGlasses(1, '2026-11-23', now)
    expect(await streak()).toEqual({ current: 0, best: 2 })
    await changeWaterGlasses(1, today, now)
    expect(await streak()).toEqual({ current: 1, best: 2 })
  })

  it('limita hábitos a oito no total (RF-25)', async () => {
    await seedDefaultHabits(now)
    for (let index = 0; index < MAX_HABITS - 3; index += 1) {
      expect(await addCustomHabit(`Hábito ${index}`, now)).toBeDefined()
    }
    expect(await listHabits()).toHaveLength(MAX_HABITS)
    expect(await addCustomHabit('Hábito extra', now)).toBeUndefined()
    expect(await addCustomHabit('   ', now)).toBeUndefined()
  })

  it('desativa, reativa e remove só hábitos com label (RF-79)', async () => {
    await seedDefaultHabits(now)
    const [standard] = await listHabits()
    const custom = await addCustomHabit('Ler 20 minutos', now)
    if (standard === undefined || custom === undefined) throw new Error('hábitos ausentes')

    await setHabitActive(standard.id, false, now)
    expect((await listHabits()).find((habit) => habit.id === standard.id)?.active).toBe(false)
    await setHabitActive(standard.id, true, now)
    expect(await removeCustomHabit(standard.id, now)).toBe(false)

    expect(await removeCustomHabit(custom.id, now)).toBe(true)
    expect((await listHabits()).map((habit) => habit.id)).not.toContain(custom.id)
  })
})
