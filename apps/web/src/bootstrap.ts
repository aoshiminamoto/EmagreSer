/** Liga as peças de rede no arranque do app e no login (fase 4A). */
import { onSessionReady, startFlags } from './flags/client'
import { onAuthRequired } from './net/auth-client'
import { resetSyncForLogin, startSync } from './sync/engine'
import { updateSyncState } from './sync/status'

export function startClient(): () => void {
  const stopAuth = onAuthRequired(() => updateSyncState({ authRequired: true }))
  const stopSync = startSync()
  const stopFlags = startFlags()
  return () => {
    stopAuth()
    stopSync()
    stopFlags()
  }
}

/** Chamado depois de entrar: fila preservada, cursor zerado e flags reavaliadas. */
export async function onLogin(): Promise<void> {
  await resetSyncForLogin()
  await onSessionReady()
}
