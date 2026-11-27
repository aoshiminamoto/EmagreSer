import { db } from './db'
import type { CalendarDate, Mood, WeightEntry } from './entities'
import { writeWithOutbox } from './outbox'

export interface WeightEntryInput {
  date: CalendarDate
  weightKg: number
  mood?: Mood
  note?: string
}

/** Mensagens sem dados de saúde: a tela traduz o motivo para a pessoa. */
export class WeightEntryNotFoundError extends Error {
  constructor() {
    super('Weight entry not found')
  }
}

export class WeightDateConflictError extends Error {
  constructor() {
    super('Weight entry already exists on this date')
  }
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

/**
 * RF-18: editar mantém o id mesmo ao trocar a data e nunca duplica um dia já
 * ocupado por outro registro ativo.
 */
export async function editWeightEntry(
  id: string,
  input: WeightEntryInput,
  now: Date = new Date(),
): Promise<WeightEntry> {
  const current = await db.weightEntries.get(id)
  if (current === undefined || current.deleted) throw new WeightEntryNotFoundError()
  const clash = await db.weightEntries
    .where('date')
    .equals(input.date)
    .filter((entry) => !entry.deleted && entry.id !== id)
    .first()
  if (clash !== undefined) throw new WeightDateConflictError()
  const record: WeightEntry = {
    ...current,
    date: input.date,
    weightKg: input.weightKg,
    mood: input.mood,
    note: input.note,
    updatedAt: now.toISOString(),
    deleted: false,
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

/** RF-27: o humor escolhido depois do salvamento atualiza o registro e sincroniza. */
export async function setWeightMood(id: string, mood: Mood, now: Date = new Date()): Promise<void> {
  const current = await db.weightEntries.get(id)
  if (current === undefined || current.deleted) throw new WeightEntryNotFoundError()
  const record: WeightEntry = {
    ...current,
    mood,
    deleted: false,
    updatedAt: now.toISOString(),
  }
  await writeWithOutbox(db.weightEntries, record, 'weight_entries', 'upsert')
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
