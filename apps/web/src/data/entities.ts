/**
 * Entidades espelhadas no IndexedDB. Os nomes dos campos seguem o domínio
 * (camelCase); a conversão para o formato da API fica no motor de sincronização.
 */

/** Data de calendário no formato YYYY-MM-DD. */
export type CalendarDate = string

/** Instante ISO da última alteração no aparelho. */
export type UpdatedAt = string

export interface SyncRecord {
  id: string
  updatedAt: UpdatedAt
  /** Tombstone: registros excluídos não entram nos cálculos nem nas telas. */
  deleted?: boolean
}

export type Mood = 'feliz' | 'ansioso' | 'cansado' | 'estressado'

export interface WeightEntry extends SyncRecord {
  date: CalendarDate
  /** Quilogramas com uma casa decimal. */
  weightKg: number
  mood?: Mood
  note?: string
}

export interface Milestone extends SyncRecord {
  milestoneKg: number
  achievedDate?: CalendarDate
  /** Existe só no aparelho; nunca entra na fila de saída. */
  celebrated?: boolean
}

export interface Habit extends SyncRecord {
  key: string
  /** Vazio nos hábitos padrão; preenchido só nos personalizados. */
  label?: string
  active: boolean
  sortOrder: number
}

export interface HabitLog extends SyncRecord {
  date: CalendarDate
  habitId: string
  done: boolean
}

export interface WaterLog extends SyncRecord {
  date: CalendarDate
  glasses: number
}

export interface Settings extends SyncRecord {
  startWeightKg?: number
  targetWeightKg?: number
  startDate?: CalendarDate
  milestoneStepKg: number
  reminderEnabled: boolean
  reminderTime: string
  /** Dias da semana (1 = segunda, 7 = domingo). */
  reminderDays: number[]
  timezone: string
  waterGoalGlasses: number
  waterGlassMl: number
  locale: string
  onboardingDone: boolean
  heightCm?: number
  bmiVisible: boolean
}

/** Foto de progresso: o blob nunca sai do aparelho e nunca sincroniza. */
export interface ProgressPhoto {
  id: string
  date: CalendarDate
  angle: string
  blob: Blob
  createdAt: UpdatedAt
}

/** Entidades sincronizáveis, com os mesmos nomes usados pela API. */
export type SyncEntity =
  'settings' | 'weight_entries' | 'habits' | 'habit_logs' | 'water_logs' | 'milestones'

export type SyncOp = 'upsert' | 'delete'

export interface OutboxChange {
  seq?: number
  entity: SyncEntity
  id: string
  op: SyncOp
  /** Cópia do registro local; o motor de sincronização converte para a API. */
  data: Record<string, unknown>
  clientUpdatedAt: UpdatedAt
}

export type MetaKey =
  | 'deviceId'
  | 'lastPullCursor'
  | 'localePref'
  | 'flags'
  | 'streak'
  | 'sessionActive'
  | 'welcomeLastIndex'

export interface MetaRecord {
  key: MetaKey
  value: unknown
}
