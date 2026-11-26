/**
 * Conversão entre o formato camelCase do IndexedDB e o formato snake_case da
 * API (seção 4.5). Fotos nunca passam por aqui.
 */
import type { Table } from 'dexie'
import { db } from '../data/db'
import { getSettings } from '../data/settings'
import type { OutboxChange, SyncEntity, SyncRecord } from '../data/entities'

export interface PullChange {
  entity: SyncEntity
  id: string
  op: 'upsert' | 'delete'
  data: Record<string, unknown>
  clientUpdatedAt: string
  changeSeq: number
  deletedAt: string | null
}

export interface PushChange {
  entity: SyncEntity
  id: string
  op: 'upsert' | 'delete'
  data: Record<string, unknown>
  clientUpdatedAt: string
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function nullableText(value: unknown): string | null | undefined {
  return value === null ? null : text(value)
}

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function flag(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function numbers(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? (value as number[])
    : undefined
}

function compact(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined))
}

function fromLocal(data: Record<string, unknown>, entity: SyncEntity): Record<string, unknown> {
  switch (entity) {
    case 'settings':
      return compact({
        start_weight_kg: numeric(data.startWeightKg),
        target_weight_kg: numeric(data.targetWeightKg),
        start_date: text(data.startDate),
        milestone_step_kg: numeric(data.milestoneStepKg),
        reminder_enabled: flag(data.reminderEnabled),
        reminder_time: text(data.reminderTime),
        reminder_days: numbers(data.reminderDays),
        timezone: text(data.timezone),
        water_goal_glasses: numeric(data.waterGoalGlasses),
        water_glass_ml: numeric(data.waterGlassMl),
        locale: text(data.locale),
        onboarding_done: flag(data.onboardingDone),
        height_cm: numeric(data.heightCm),
        bmi_visible: flag(data.bmiVisible),
      })
    case 'weight_entries':
      return compact({
        date: text(data.date),
        weight_kg: numeric(data.weightKg),
        mood: text(data.mood),
        note: text(data.note),
      })
    case 'habits':
      return compact({
        key: text(data.key),
        label: nullableText(data.label),
        active: flag(data.active),
        sort_order: numeric(data.sortOrder),
      })
    case 'habit_logs':
      return compact({
        date: text(data.date),
        habit_id: text(data.habitId),
        done: flag(data.done),
      })
    case 'water_logs':
      return compact({ date: text(data.date), glasses: numeric(data.glasses) })
    case 'milestones':
      return compact({
        milestone_kg: numeric(data.milestoneKg),
        achieved_date: nullableText(data.achievedDate),
      })
  }
}

export function toPushChange(change: OutboxChange): PushChange {
  return {
    entity: change.entity,
    id: change.id,
    op: change.op,
    data: change.op === 'upsert' ? fromLocal(change.data, change.entity) : {},
    clientUpdatedAt: change.clientUpdatedAt,
  }
}

function toLocalRecord(change: PullChange, existing: SyncRecord | undefined): SyncRecord {
  const id = change.entity === 'settings' ? (existing?.id ?? crypto.randomUUID()) : change.id
  const data = change.data
  const record: Record<string, unknown> = {
    id,
    updatedAt: change.clientUpdatedAt,
    deleted: change.op === 'delete',
  }
  switch (change.entity) {
    case 'settings':
      record.deleted = false
      Object.assign(record, {
        startWeightKg: numeric(data.start_weight_kg),
        targetWeightKg: numeric(data.target_weight_kg),
        startDate: nullableText(data.start_date) ?? undefined,
        milestoneStepKg: numeric(data.milestone_step_kg),
        reminderEnabled: flag(data.reminder_enabled),
        reminderTime: text(data.reminder_time),
        reminderDays: numbers(data.reminder_days),
        timezone: text(data.timezone),
        waterGoalGlasses: numeric(data.water_goal_glasses),
        waterGlassMl: numeric(data.water_glass_ml),
        locale: text(data.locale),
        onboardingDone: flag(data.onboarding_done),
        heightCm: numeric(data.height_cm),
        bmiVisible: flag(data.bmi_visible),
      })
      break
    case 'weight_entries':
      Object.assign(record, {
        date: text(data.date),
        weightKg: numeric(data.weight_kg),
        mood: text(data.mood),
        note: nullableText(data.note) ?? undefined,
      })
      break
    case 'habits':
      Object.assign(record, {
        key: text(data.key),
        label: nullableText(data.label) ?? undefined,
        active: flag(data.active),
        sortOrder: numeric(data.sort_order),
      })
      break
    case 'habit_logs':
      Object.assign(record, {
        date: text(data.date),
        habitId: text(data.habit_id),
        done: flag(data.done),
      })
      break
    case 'water_logs':
      Object.assign(record, { date: text(data.date), glasses: numeric(data.glasses) })
      break
    case 'milestones':
      Object.assign(record, {
        milestoneKg: numeric(data.milestone_kg),
        achievedDate: nullableText(data.achieved_date) ?? undefined,
        // `celebrated` é exclusivo do aparelho: nunca vem nem volta pela API.
        ...(existing !== undefined && 'celebrated' in existing
          ? { celebrated: existing.celebrated }
          : {}),
      })
      break
  }
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) delete record[key]
  }
  return record as unknown as SyncRecord
}

type LocalTable = Table<SyncRecord, string>

function tableFor(entity: SyncEntity): LocalTable {
  switch (entity) {
    case 'settings':
      return db.settings as unknown as LocalTable
    case 'weight_entries':
      return db.weightEntries as unknown as LocalTable
    case 'habits':
      return db.habits as unknown as LocalTable
    case 'habit_logs':
      return db.habitLogs as unknown as LocalTable
    case 'water_logs':
      return db.waterLogs as unknown as LocalTable
    case 'milestones':
      return db.milestones as unknown as LocalTable
  }
}

/**
 * Aplica uma alteração recebida. Se a cópia local for mais nova, ela vence e
 * continua na fila de saída; caso contrário o estado do servidor é aplicado e
 * a versão antiga sai da fila.
 */
export async function applyRemoteChange(change: PullChange): Promise<boolean> {
  const table = tableFor(change.entity)
  const existing: SyncRecord | undefined =
    change.entity === 'settings' ? await getSettings() : await table.get(change.id)
  const localTime =
    existing === undefined ? Number.NEGATIVE_INFINITY : Date.parse(existing.updatedAt)
  const remoteTime = Date.parse(change.clientUpdatedAt)
  if (Number.isFinite(localTime) && localTime > remoteTime) return false

  const record = toLocalRecord(change, existing)
  await db.transaction('rw', table, db.outbox, db.weightEntries, async () => {
    await table.put(record)
    const stale = await db.outbox
      .filter(
        (item) =>
          item.seq !== undefined &&
          item.entity === change.entity &&
          (change.entity === 'settings' || item.id === change.id),
      )
      .toArray()
    if (stale.length > 0) {
      await db.outbox.bulkDelete(stale.map((item) => item.seq as number))
    }

    // Duas datas iguais no servidor: a mais antiga vira tombstone também aqui.
    if (change.entity === 'weight_entries' && change.op === 'upsert') {
      const date = text(change.data.date)
      if (date !== undefined) {
        const sameDay = await db.weightEntries.where('date').equals(date).toArray()
        for (const entry of sameDay) {
          if (
            entry.id !== change.id &&
            !entry.deleted &&
            Date.parse(entry.updatedAt) < remoteTime
          ) {
            await db.weightEntries.update(entry.id, {
              deleted: true,
              updatedAt: change.clientUpdatedAt,
            })
          }
        }
      }
    }
  })
  return true
}
