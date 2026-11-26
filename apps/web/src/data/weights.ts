import { db } from './db'
import type { CalendarDate, Mood, WeightEntry } from './entities'
import { writeWithOutbox } from './outbox'

export interface WeightEntryInput {
  date: CalendarDate
  weightKg: number
  mood?: Mood
  note?: string
}

/** Um peso por data: uma edição reaproveita o id do registro ativo. */
export async function putWeightEntry(
  input: WeightEntryInput,
  now: Date = new Date(),
): Promise<WeightEntry> {
  const existing = await db.weightEntries
    .where('date')
    .equals(input.date)
    .filter((entry) => !entry.deleted)
    .first()
  const record: WeightEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    date: input.date,
    weightKg: input.weightKg,
    ...(input.mood !== undefined ? { mood: input.mood } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    updatedAt: now.toISOString(),
  }
  return writeWithOutbox(db.weightEntries, record, 'weight_entries', 'upsert')
}

export async function getWeightEntry(date: CalendarDate): Promise<WeightEntry | undefined> {
  return db.weightEntries
    .where('date')
    .equals(date)
    .filter((entry) => !entry.deleted)
    .first()
}

export async function listWeightEntries(): Promise<WeightEntry[]> {
  const entries = await db.weightEntries.toArray()
  return entries.filter((entry) => !entry.deleted).sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteWeightEntry(id: string, now: Date = new Date()): Promise<void> {
  const current = await db.weightEntries.get(id)
  if (current === undefined || current.deleted) return
  const tombstone: WeightEntry = {
    ...current,
    deleted: true,
    updatedAt: now.toISOString(),
  }
  await writeWithOutbox(db.weightEntries, tombstone, 'weight_entries', 'delete')
}
