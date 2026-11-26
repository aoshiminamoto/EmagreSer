import type { WeightEntry } from './types.js'
import { latestWeight } from './weight.js'

function roundKg(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * RN-03: P−S, P−2S... enquanto o valor for maior que A; o último é sempre A.
 * Sem queda (A >= P) não há marcos; passo inválido lança RangeError.
 */
export function generateMilestones(
  startWeightKg: number,
  targetWeightKg: number,
  stepKg: number,
): number[] {
  if (!Number.isFinite(stepKg) || roundKg(stepKg) <= 0) {
    throw new RangeError('Milestone step must be positive')
  }
  if (startWeightKg <= targetWeightKg) return []

  const milestones: number[] = []
  let value = roundKg(startWeightKg - stepKg)
  while (value > targetWeightKg) {
    milestones.push(value)
    value = roundKg(value - stepKg)
  }
  milestones.push(roundKg(targetWeightKg))
  return milestones
}

/** RN-03: qualquer peso registrado menor ou igual ao marco o alcança. */
export function isMilestoneAchieved(milestoneKg: number, entries: readonly WeightEntry[]): boolean {
  return entries.some((entry) => entry.deleted !== true && entry.weightKg <= milestoneKg)
}

/**
 * RN-04: percentual até a meta, limitado a 0–100%.
 * Quando P == A a meta já está cumprida, o resultado é 100%.
 */
export function progressPercent(
  startWeightKg: number,
  currentWeightKg: number,
  targetWeightKg: number,
): number {
  if (startWeightKg <= targetWeightKg) return 100
  const ratio = ((startWeightKg - currentWeightKg) / (startWeightKg - targetWeightKg)) * 100
  return Math.min(100, Math.max(0, ratio))
}

/** Atalho para o progresso usando o peso de referência (RN-02). */
export function progressFromEntries(
  startWeightKg: number,
  targetWeightKg: number,
  entries: readonly WeightEntry[],
): number {
  const current = latestWeight(entries)
  if (current === null) return 0
  return progressPercent(startWeightKg, current.weightKg, targetWeightKg)
}
