import { db } from './db'
import type { CalendarDate, HabitLog } from './entities'
import { writeWithOutbox } from './outbox'

export interface HabitLogInput {
  date: CalendarDate
  habitId: string
  done?: boolean
}

/** Um registro por (data, hábito): uma edição reaproveita o id ativo. */
export async function putHabitLog(input: HabitLogInput, now: Date = new Date()): Promise<HabitLog> {
  const existing = await db.habitLogs
    .where('date')
    .equals(input.date)
    .filter((log) => log.habitId === input.habitId && !log.deleted)
    .first()
  const record: HabitLog = {
    id: existing?.id ?? crypto.randomUUID(),
    date: input.date,
    habitId: input.habitId,
    done: input.done ?? true,
    updatedAt: now.toISOString(),
  }
  return writeWithOutbox(db.habitLogs, record, 'habit_logs', 'upsert')
}

export async function getHabitLog(
  date: CalendarDate,
  habitId: string,
): Promise<HabitLog | undefined> {
  return db.habitLogs
    .where('date')
    .equals(date)
    .filter((log) => log.habitId === habitId && !log.deleted)
    .first()
}

export async function listHabitLogs(): Promise<HabitLog[]> {
  const logs = await db.habitLogs.toArray()
  return logs.filter((log) => !log.deleted).sort((a, b) => a.date.localeCompare(b.date))
}

export async function listHabitLogsByDate(date: CalendarDate): Promise<HabitLog[]> {
  const logs = await db.habitLogs.where('date').equals(date).toArray()
  return logs.filter((log) => !log.deleted)
}

export async function deleteHabitLog(id: string, now: Date = new Date()): Promise<void> {
  const current = await db.habitLogs.get(id)
  if (current === undefined || current.deleted) return
  const tombstone: HabitLog = { ...current, deleted: true, updatedAt: now.toISOString() }
  await writeWithOutbox(db.habitLogs, tombstone, 'habit_logs', 'delete')
}
