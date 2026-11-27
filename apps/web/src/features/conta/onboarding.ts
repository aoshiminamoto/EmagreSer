/**
 * RF-01 a RF-03: o onboarding só grava ao concluir. Fechar no meio recomeça do
 * passo 1 sem deixar registro parcial; pular o IMC não grava altura nem IMC.
 */
import { getSettings, saveSettings } from '../../data/settings'
import { seedDefaultHabits } from '../../data/habits'
import { putWeightEntry } from '../../data/weights'
import { ensurePersistentStorage } from '../fotos/storage'
import { i18n, type Locale } from '../../i18n'
import { recalcAfterPull, todayCalendar } from '../../sync/recalc'

export interface OnboardingInput {
  currentWeightKg: number
  targetWeightKg: number
  stepKg: number
  /** Indefinido quando a tela do IMC foi pulada. */
  heightCm?: number
  bmiVisible: boolean
  reminderTime: string
}

export async function isOnboardingDone(): Promise<boolean> {
  const settings = await getSettings()
  return settings?.onboardingDone === true
}

function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** RF-03: o fuso do aparelho é atualizado quando muda (viagem, ajuste manual). */
export async function syncDeviceTimezone(now: Date = new Date()): Promise<void> {
  const settings = await getSettings()
  if (settings === undefined || settings.deleted === true) return
  if (settings.timezone !== deviceTimezone())
    await saveSettings({ timezone: deviceTimezone() }, now)
}

/** O peso-alvo precisa ser menor que o atual (RF-02). */
export function isValidTarget(targetKg: number, currentKg: number): boolean {
  return (
    Number.isFinite(targetKg) && Number.isFinite(currentKg) && targetKg > 0 && targetKg < currentKg
  )
}

export async function completeOnboarding(
  input: OnboardingInput,
  now: Date = new Date(),
): Promise<void> {
  if (!isValidTarget(input.targetWeightKg, input.currentWeightKg)) {
    throw new RangeError('TARGET_NOT_LOWER')
  }
  await saveSettings(
    {
      startWeightKg: input.currentWeightKg,
      targetWeightKg: input.targetWeightKg,
      startDate: todayCalendar(now),
      milestoneStepKg: input.stepKg,
      reminderTime: input.reminderTime,
      reminderEnabled: true,
      reminderDays: [1, 2, 3, 4, 5, 6, 7],
      timezone: deviceTimezone(),
      locale: i18n.global.locale.value as Locale,
      onboardingDone: true,
      ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
      bmiVisible: input.bmiVisible,
    },
    now,
  )
  await putWeightEntry({ date: todayCalendar(now), weightKg: input.currentWeightKg }, now)
  await seedDefaultHabits(now)
  // RN-03/RN-06: marcos e streak derivam do peso inicial e das configurações.
  await recalcAfterPull(now)
  // RN PWA: protege o IndexedDB (com as fotos) sem bloquear o onboarding se falhar.
  await ensurePersistentStorage()
}
