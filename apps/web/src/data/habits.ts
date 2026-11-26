import { db } from './db'
import type { Habit } from './entities'
import { writeWithOutbox } from './outbox'

export interface HabitInput {
  key: string
  label?: string
  active?: boolean
  sortOrder?: number
}

/** Chaves dos hábitos padrão; o rótulo vem do catálogo de idioma. */
export const DEFAULT_HABIT_KEYS = ['vegetais', 'sono', 'exercicio'] as const

export async function findHabitByKey(key: string): Promise<Habit | undefined> {
  return db.habits
    .where('key')
    .equals(key)
    .filter((habit) => !habit.deleted)
    .first()
}

/** Um hábito por chave: uma edição reaproveita o id do registro ativo. */
export async function putHabit(input: HabitInput, now: Date = new Date()): Promise<Habit> {
  const existing = await findHabitByKey(input.key)
  const record: Habit = {
    id: existing?.id ?? crypto.randomUUID(),
    key: input.key,
    ...(input.label !== undefined ? { label: input.label } : {}),
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    updatedAt: now.toISOString(),
  }
  return writeWithOutbox(db.habits, record, 'habits', 'upsert')
}

export async function listHabits(): Promise<Habit[]> {
  const habits = await db.habits.toArray()
  return habits.filter((habit) => !habit.deleted).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function deleteHabit(id: string, now: Date = new Date()): Promise<void> {
  const current = await db.habits.get(id)
  if (current === undefined || current.deleted) return
  const tombstone: Habit = { ...current, deleted: true, updatedAt: now.toISOString() }
  await writeWithOutbox(db.habits, tombstone, 'habits', 'delete')
}

/** Cria os três hábitos padrão uma única vez, sem ajustes na fila já existente. */
export async function seedDefaultHabits(now: Date = new Date()): Promise<Habit[]> {
  const habits: Habit[] = []
  for (const [sortOrder, key] of DEFAULT_HABIT_KEYS.entries()) {
    const existing = await findHabitByKey(key)
    habits.push(existing ?? (await putHabit({ key, active: true, sortOrder }, now)))
  }
  return habits
}
