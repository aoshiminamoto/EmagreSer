/** Regras de marcos e progresso espelhadas de RN-03/RN-04 (D-36). */
import type { Milestone } from '../../data/entities'

/** Próximo passo: o marco pendente mais próximo abaixo do peso de referência. */
export function nextPendingMilestone(
  milestones: readonly Milestone[],
  currentKg: number,
): Milestone | undefined {
  return milestones
    .filter(
      (milestone) =>
        milestone.deleted !== true &&
        milestone.achievedDate === undefined &&
        milestone.milestoneKg < currentKg,
    )
    .sort((a, b) => b.milestoneKg - a.milestoneKg)[0]
}

/** RN-04: progresso até a meta final, entre 0% e 100%. */
export function progressPercent(startKg: number, currentKg: number, targetKg: number): number {
  if (startKg <= targetKg) return 100
  const ratio = ((startKg - currentKg) / (startKg - targetKg)) * 100
  return Math.min(100, Math.max(0, ratio))
}

export interface CelebrationSelection {
  milestoneKg: number
  count: number
}

/**
 * RF-14: marcos recém-alcançados e ainda não celebrados. Quando vários são
 * cruzados de uma vez, o mais distante do ponto de partida (menor peso, mais
 * próximo da meta) é o destaque da celebração.
 */
export function selectCelebration(milestones: readonly Milestone[]): CelebrationSelection | null {
  const candidates = milestones.filter(
    (milestone) =>
      milestone.deleted !== true &&
      milestone.achievedDate !== undefined &&
      milestone.celebrated !== true,
  )
  if (candidates.length === 0) return null
  const featured = candidates.reduce((chosen, candidate) =>
    candidate.milestoneKg < chosen.milestoneKg ? candidate : chosen,
  )
  return { milestoneKg: featured.milestoneKg, count: candidates.length }
}
