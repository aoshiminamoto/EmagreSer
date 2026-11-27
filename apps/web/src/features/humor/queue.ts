/**
 * Fila pós-salvamento (RF-07/RF-27/RF-29): a celebração da Fase 5 vem primeiro;
 * depois o acolhimento (RN-05) e, por fim, a escolha opcional do humor.
 */
import { computed, shallowRef } from 'vue'
import type { WeightEntry } from '../../data/entities'
import { celebrationSettled } from '../metas/celebration'
import { onPesoEvent, type WeightSavedContext } from '../peso/events'

export type PostSaveStep =
  { kind: 'welcome'; context: WeightSavedContext } | { kind: 'mood'; entry: WeightEntry }

/** Ordem fixa: acolhimento antes da pergunta sobre o humor. */
export function buildPostSaveSteps(
  context: WeightSavedContext,
  moodEntry?: WeightEntry,
): PostSaveStep[] {
  const steps: PostSaveStep[] = []
  // RN-05: o evento só chega quando há subida, uma vez por registro.
  if (context.isIncrease) steps.push({ kind: 'welcome', context })
  if (moodEntry !== undefined) steps.push({ kind: 'mood', entry: moodEntry })
  return steps
}

const steps = shallowRef<PostSaveStep[]>([])
export const queuedSteps = computed<readonly PostSaveStep[]>(() => steps.value)

interface Pending {
  context?: WeightSavedContext
  entry?: WeightEntry
}

let pending: Pending = {}
let scheduled = false

export function startPostSaveListener(): () => void {
  const offSaved = onPesoEvent('weight:saved', (context) => {
    pending.context = context
    schedule()
  })
  const offMood = onPesoEvent('mood:prompt', ({ entry }) => {
    pending.entry = entry
  })
  const offWelcome = onPesoEvent('welcome:prompt', (context) => {
    pending.context = context
  })
  return () => {
    offSaved()
    offMood()
    offWelcome()
    pending = {}
    steps.value = []
  }
}

/** Microtarefa: todos os eventos síncronos de `announce` já foram emitidos. */
function schedule(): void {
  if (scheduled) return
  scheduled = true
  void Promise.resolve()
    .then(() => celebrationSettled())
    .then(() => {
      scheduled = false
      const { context, entry } = pending
      pending = {}
      if (context === undefined) return
      steps.value = buildPostSaveSteps(context, entry)
    })
}

export function dismissPostSaveStep(): void {
  steps.value = steps.value.slice(1)
}
