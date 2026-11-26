/**
 * Tipos das entidades espelhadas entre PostgreSQL e IndexedDB.
 * Nenhum destes tipos depende de Vue, rede ou disco.
 */

/** Data de calendário no formato YYYY-MM-DD (dia civil, sem fuso). */
export type CalendarDate = string

/** Hora local no formato HH:mm. */
export type ClockTime = string

export interface SyncRecord {
  /** Instante ISO da última alteração no aparelho. */
  updatedAt: string
  /** Tombstone: registros excluídos não entram nos cálculos. */
  deleted?: boolean
}

export interface WeightEntry extends SyncRecord {
  id: string
  date: CalendarDate
  /** Quilogramas com uma casa decimal. */
  weightKg: number
  mood?: 'feliz' | 'ansioso' | 'cansado' | 'estressado'
  note?: string
}

export interface Milestone extends SyncRecord {
  id: string
  milestoneKg: number
  achievedDate?: CalendarDate
  /** Existe só no aparelho; nunca sincroniza. */
  celebrated?: boolean
}

export interface Habit extends SyncRecord {
  id: string
  key: string
  /** Vazio nos hábitos padrão; preenchido só nos personalizados. */
  label?: string
  active: boolean
  sortOrder: number
}

export interface HabitLog extends SyncRecord {
  id: string
  date: CalendarDate
  habitId: string
  done: boolean
}

export interface WaterLog extends SyncRecord {
  id: string
  date: CalendarDate
  glasses: number
}

export interface Settings {
  id: string
  startWeightKg?: number
  targetWeightKg?: number
  startDate?: CalendarDate
  milestoneStepKg: number
  reminderEnabled: boolean
  reminderTime: ClockTime
  /** Dias da semana (1 = segunda, 7 = domingo). */
  reminderDays: number[]
  timezone: string
  waterGoalGlasses: number
  waterGlassMl: number
  locale: string
  onboardingDone: boolean
  heightCm?: number
  bmiVisible: boolean
  updatedAt: string
  deleted?: boolean
}

/** Qualquer ação que torna um dia ativo para o streak (RF-21). */
export interface ActivityDate {
  date: CalendarDate
}
