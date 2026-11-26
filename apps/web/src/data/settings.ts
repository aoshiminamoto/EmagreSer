import { db } from './db'
import type { Settings } from './entities'
import { writeWithOutbox } from './outbox'

/** Valores iniciais da seção 7; `locale` e demais preferências podem mudar depois. */
export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updatedAt'> = {
  milestoneStepKg: 2,
  reminderEnabled: true,
  reminderTime: '07:30',
  reminderDays: [1, 2, 3, 4, 5, 6, 7],
  timezone: 'America/Sao_Paulo',
  waterGoalGlasses: 8,
  waterGlassMl: 250,
  locale: 'pt-BR',
  onboardingDone: false,
  bmiVisible: false,
}

export type SettingsInput = Partial<Omit<Settings, 'id' | 'updatedAt' | 'deleted'>>

export async function getSettings(): Promise<Settings | undefined> {
  const rows = await db.settings.toArray()
  return rows.find((settings) => !settings.deleted)
}

/** Uma única linha de configuração; o id é gerado no cliente uma vez. */
export async function saveSettings(
  input: SettingsInput,
  now: Date = new Date(),
): Promise<Settings> {
  const current = await getSettings()
  const record: Settings = {
    ...DEFAULT_SETTINGS,
    reminderDays: [...DEFAULT_SETTINGS.reminderDays],
    ...current,
    ...input,
    id: current?.id ?? crypto.randomUUID(),
    updatedAt: now.toISOString(),
    deleted: false,
  }
  return writeWithOutbox(db.settings, record, 'settings', 'upsert')
}

export async function ensureSettings(now: Date = new Date()): Promise<Settings> {
  return (await getSettings()) ?? saveSettings({}, now)
}
