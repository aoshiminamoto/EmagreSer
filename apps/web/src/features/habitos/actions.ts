/**
 * Escritas de hábitos e água: cada ação entra na fila de saída e atualiza o
 * streak local (RF-21/RF-23/RF-24), sem depender de rede.
 */
import type { CalendarDate, Habit } from '../../data/entities'
import { deleteHabit, findHabitById, listHabits, putHabit } from '../../data/habits'
import { getHabitLog, putHabitLog } from '../../data/habitLogs'
import { deleteWaterLog, getWaterLog, putWaterLog } from '../../data/waterLogs'
import { recalcStreak } from '../../sync/recalc'

export const MAX_HABITS = 8

/** RF-23: alterna o registro do dia, reaproveitando o id quando já existe. */
export async function toggleHabitLog(
  habitId: string,
  date: CalendarDate,
  now: Date = new Date(),
): Promise<boolean> {
  const current = await getHabitLog(date, habitId)
  const done = current?.done !== true
  await putHabitLog({ date, habitId, done }, now)
  await recalcStreak(now)
  return done
}

/**
 * RF-24: um copo a mais ou a menos, sem ficar negativo. Voltar a zero apaga o
 * registro do dia, porque "zero copos" não é uma ação ativa (RF-21, D-59).
 */
export async function changeWaterGlasses(
  delta: number,
  date: CalendarDate,
  now: Date = new Date(),
): Promise<number> {
  const current = await getWaterLog(date)
  const glasses = Math.max(0, (current?.glasses ?? 0) + delta)
  if (glasses === 0) {
    if (current !== undefined) await deleteWaterLog(current.id, now)
  } else {
    await putWaterLog({ date, glasses }, now)
  }
  await recalcStreak(now)
  return glasses
}

/** RF-25: hábitos personalizados só entram com texto e até o limite total. */
export async function addCustomHabit(
  label: string,
  now: Date = new Date(),
): Promise<Habit | undefined> {
  const text = label.trim()
  if (text.length === 0) return undefined
  const habits = await listHabits()
  if (habits.length >= MAX_HABITS) return undefined
  const sortOrder =
    habits.length === 0 ? 0 : Math.max(...habits.map((habit) => habit.sortOrder)) + 1
  return putHabit(
    { key: `custom-${crypto.randomUUID()}`, label: text, active: true, sortOrder },
    now,
  )
}

/** RF-25: ativar/desativar preserva chave, texto e ordem do hábito. */
export async function setHabitActive(
  id: string,
  active: boolean,
  now: Date = new Date(),
): Promise<void> {
  const habit = await findHabitById(id)
  if (habit === undefined || habit.deleted === true || habit.active === active) return
  await putHabit(
    {
      key: habit.key,
      ...(habit.label === undefined ? {} : { label: habit.label }),
      active,
      sortOrder: habit.sortOrder,
    },
    now,
  )
}

/** RF-25: apenas hábitos com `label` (personalizados) podem ser removidos. */
export async function removeCustomHabit(id: string, now: Date = new Date()): Promise<boolean> {
  const habit = await findHabitById(id)
  if (habit === undefined || habit.deleted === true || habit.label === undefined) return false
  await deleteHabit(id, now)
  return true
}
