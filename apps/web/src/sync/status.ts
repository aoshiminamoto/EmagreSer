/** Estado discreto da sincronização; nenhum erro técnico é exposto à tela. */
import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'

export type SyncStatus = 'synced' | 'pending' | 'offline'

export interface SyncState {
  status: SyncStatus
  /** Quantos registros já vieram do servidor no download em andamento. */
  downloaded: number
  /** Sessão expirada: o app continua funcionando, mas precisa de novo login. */
  authRequired: boolean
}

const initialState: SyncState = { status: 'offline', downloaded: 0, authRequired: false }
let state: SyncState = initialState
const listeners = new Set<(value: SyncState) => void>()

export function getSyncState(): SyncState {
  return state
}

export function updateSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

export function subscribeSync(listener: (value: SyncState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Para uso em componentes; o estado também existe fora de componentes para testes. */
export function useSyncState(): ShallowRef<SyncState> {
  const value = shallowRef(state)
  const stop = subscribeSync((next) => {
    value.value = next
  })
  onScopeDispose(stop)
  return value
}
