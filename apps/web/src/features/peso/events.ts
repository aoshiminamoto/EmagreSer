/**
 * Pontos de extensão (RF-07): o registro apenas anuncia o que aconteceu.
 * Humor, mensagem de acolhimento e celebração de marco se inscrevem nas fases 5 e 7.
 */
import type { WeightEntry } from '../../data/entities'

export interface WeightSavedContext {
  entry: WeightEntry
  previous?: WeightEntry
  isIncrease: boolean
}

export interface PesoEvents {
  'weight:saved': WeightSavedContext
  'mood:prompt': { entry: WeightEntry }
  'welcome:prompt': WeightSavedContext
  'milestone:evaluate': { entry: WeightEntry }
}

type AnyHandler = (payload: never) => void

const handlers = new Map<keyof PesoEvents, Set<AnyHandler>>()

export function onPesoEvent<K extends keyof PesoEvents>(
  event: K,
  handler: (payload: PesoEvents[K]) => void,
): () => void {
  let listeners = handlers.get(event)
  if (listeners === undefined) {
    listeners = new Set()
    handlers.set(event, listeners)
  }
  const listener = handler as AnyHandler
  listeners.add(listener)
  return () => {
    listeners?.delete(listener)
  }
}

export function emitPesoEvent<K extends keyof PesoEvents>(event: K, payload: PesoEvents[K]): void {
  const listeners = handlers.get(event)
  if (listeners === undefined) return
  for (const listener of [...listeners]) (listener as (data: PesoEvents[K]) => void)(payload)
}
