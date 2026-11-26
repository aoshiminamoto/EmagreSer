import { db } from './db'
import type { CalendarDate, WaterLog } from './entities'
import { writeWithOutbox } from './outbox'

export interface WaterLogInput {
  date: CalendarDate
  glasses: number
}

/** Um registro por data: uma edição reaproveita o id ativo. */
export async function putWaterLog(input: WaterLogInput, now: Date = new Date()): Promise<WaterLog> {
  const existing = await db.waterLogs
    .where('date')
    .equals(input.date)
    .filter((log) => !log.deleted)
    .first()
  const record: WaterLog = {
    id: existing?.id ?? crypto.randomUUID(),
    date: input.date,
    glasses: input.glasses,
    updatedAt: now.toISOString(),
  }
  return writeWithOutbox(db.waterLogs, record, 'water_logs', 'upsert')
}

export async function getWaterLog(date: CalendarDate): Promise<WaterLog | undefined> {
  return db.waterLogs
    .where('date')
    .equals(date)
    .filter((log) => !log.deleted)
    .first()
}

export async function listWaterLogs(): Promise<WaterLog[]> {
  const logs = await db.waterLogs.toArray()
  return logs.filter((log) => !log.deleted).sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteWaterLog(id: string, now: Date = new Date()): Promise<void> {
  const current = await db.waterLogs.get(id)
  if (current === undefined || current.deleted) return
  const tombstone: WaterLog = { ...current, deleted: true, updatedAt: now.toISOString() }
  await writeWithOutbox(db.waterLogs, tombstone, 'water_logs', 'delete')
}
