import Dexie, { type Table } from 'dexie'
import type {
  Habit,
  HabitLog,
  MetaKey,
  MetaRecord,
  Milestone,
  OutboxChange,
  ProgressPhoto,
  Settings,
  WaterLog,
  WeightEntry,
} from './entities'

/**
 * v1 é o schema inicial; v2 acrescenta os índices exigidos pela sincronização
 * (`updatedAt`, `habitId`, `id` na fila e `angle`). O schema final é o da seção 7.
 */
export const schemaV1: Record<string, string> = {
  settings: 'id',
  weightEntries: 'id, date',
  milestones: 'id, milestoneKg',
  habits: 'id, key',
  habitLogs: 'id, date',
  waterLogs: 'id, date',
  outbox: '++seq, entity',
  meta: 'key',
  progressPhotos: 'id, date',
}

export const schemaV2: Record<string, string> = {
  ...schemaV1,
  weightEntries: 'id, date, updatedAt',
  habitLogs: 'id, date, habitId',
  outbox: '++seq, entity, id',
  progressPhotos: 'id, date, angle',
}

/** Versão atual do banco local — mantenha em sync com `schemaV2`. */
export const CURRENT_VERSION = 2

export class EmagreSerDB extends Dexie {
  settings!: Table<Settings, string>
  weightEntries!: Table<WeightEntry, string>
  milestones!: Table<Milestone, string>
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  waterLogs!: Table<WaterLog, string>
  outbox!: Table<OutboxChange, number>
  meta!: Table<MetaRecord, MetaKey>
  progressPhotos!: Table<ProgressPhoto, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores(schemaV1)
    this.version(2).stores(schemaV2)
  }
}

export const db = new EmagreSerDB('emagreser')
