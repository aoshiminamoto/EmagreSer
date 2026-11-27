/**
 * Sessão persistente (RF-48). O cookie de refresh renova a cada uso, até 30 dias
 * de inatividade; o aparelho guarda só a marca `sessionActive` no IndexedDB.
 * Sem rede a marca continua valendo: o app abre em modo avião direto no Hoje.
 */
import { clearLocalData } from '../../data/clear'
import { getMeta, offlineFlags, setMeta } from '../../data/meta'
import { applyLocaleFromFlags } from '../../flags/client'
import {
  apiFetch,
  clearSession,
  isAuthenticated,
  isRefreshUnauthorized,
  onAuthRequired,
  refreshSession,
  setSession,
  type TokenResponse,
} from '../../net/auth-client'
import { onLogin } from '../../bootstrap'
import { unregisterOnSignOut } from '../lembretes/activation'
import { updateSyncState } from '../../sync/status'

let invalidated = false
let restorePromise: Promise<boolean> | undefined
let listening = false

function watchExpiration(): void {
  if (listening) return
  listening = true
  onAuthRequired(() => {
    invalidated = true
    void setMeta('sessionActive', false)
  })
}

/** Memoizada: a primeira navegação e o arranque compartilham a mesma restauração. */
export function restoreSession(): Promise<boolean> {
  watchExpiration()
  restorePromise ??= (async () => {
    if (invalidated) return false
    if ((await getMeta<boolean>('sessionActive')) !== true) return false
    await refreshSession()
    if (isRefreshUnauthorized()) {
      invalidated = true
      await setMeta('sessionActive', false)
      return false
    }
    return !invalidated && ((await getMeta<boolean>('sessionActive')) === true || isAuthenticated())
  })()
  return restorePromise
}

/** Chamado depois de cadastro ou login: guarda a marca e reinicia o cursor de pull. */
export async function recordSignIn(token: TokenResponse): Promise<void> {
  invalidated = false
  setSession(token)
  await setMeta('sessionActive', true)
  restorePromise = Promise.resolve(true)
  await onLogin()
}

/** Senha trocada encerra as sessões no servidor; aqui só a marca local sai. */
export async function forgetSessionLocally(): Promise<void> {
  clearSession()
  invalidated = true
  restorePromise = Promise.resolve(false)
  await setMeta('sessionActive', false)
}

/** RF-50: confirmação feita, apaga os dados locais mesmo sem rede. */
export async function signOut(): Promise<void> {
  await unregisterOnSignOut()
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // Sem rede a sessão termina só no aparelho; o cookie expira no servidor.
  }
  clearSession()
  invalidated = true
  restorePromise = Promise.resolve(false)
  await clearLocalData()
  updateSyncState({ status: 'offline', authRequired: false, downloaded: 0 })
  await applyLocaleFromFlags(offlineFlags())
}

/** Permite que cada teste comece com uma sessão restaurável. */
export function resetSessionForTests(): void {
  invalidated = false
  restorePromise = undefined
  listening = false
}
