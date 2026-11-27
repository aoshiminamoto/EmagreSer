/**
 * Celebração de marcos (RF-14). O sinal `celebrated` existe só no aparelho:
 * marcá-lo não gera item na fila de saída e sobrevive ao reinício do app.
 */
import { shallowRef } from 'vue'
import { listMilestones, setCelebrated } from '../../data/milestones'
import { onPesoEvent } from '../peso/events'
import { selectCelebration, type CelebrationSelection } from './milestones'

export const celebration = shallowRef<CelebrationSelection | null>(null)

let running = false

export async function evaluateCelebration(): Promise<void> {
  if (running) return
  running = true
  try {
    const milestones = await listMilestones()
    const selection = selectCelebration(milestones)
    if (selection === null) return
    for (const milestone of milestones) {
      if (
        milestone.deleted !== true &&
        milestone.achievedDate !== undefined &&
        milestone.celebrated !== true
      ) {
        await setCelebrated(milestone.id, true)
      }
    }
    celebration.value = selection
  } finally {
    running = false
  }
}

/** Inscrição única no barramento de peso; chamada na raiz do app. */
export function startCelebrationListener(): () => void {
  return onPesoEvent('milestone:evaluate', () => {
    void evaluateCelebration()
  })
}

export function dismissCelebration(): void {
  celebration.value = null
}
