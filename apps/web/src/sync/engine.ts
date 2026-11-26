/** Motor de sincronização: push em lotes, pull por cursor, travas e retry. */
import { getDeviceId, getLastPullCursor, setLastPullCursor } from '../data/meta'
import { countOutbox, deleteOutboxItems, listOutbox } from '../data/outbox'
import { AuthRequiredError, apiJson, isAuthenticated } from '../net/auth-client'
import { applyRemoteChange, toPushChange, type PullChange } from './mapping'
import { recalcAfterPull } from './recalc'
import { cancelPendingWrite, registerSyncTrigger, unregisterSyncTrigger } from './scheduler'
import { updateSyncState } from './status'

const BATCH_SIZE = 200
const PULL_LIMIT = 500
const MIN_BACKOFF_MS = 2_000
const MAX_BACKOFF_MS = 5 * 60_000
const PERIOD_MS = 5 * 60_000
const LOCK_NAME = 'emagreser-sync'

interface AppliedChange {
  entity: string
  id: string
  changeSeq: number | null
}

interface ConflictingChange {
  entity: string
  id: string
  reason: string
}

interface PushResult {
  applied: AppliedChange[]
  conflicts: ConflictingChange[]
  cursor: number
}

interface PullResult {
  changes: PullChange[]
  nextCursor: number
  hasMore: boolean
}

let failures = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let processLock = false

function isOnline(): boolean {
  return globalThis.navigator?.onLine !== false
}

/** Web Locks quando disponível; no iOS fallback para uma trava dentro da aba. */
export async function withSyncLock<T>(task: () => Promise<T>): Promise<T | undefined> {
  const locks = globalThis.navigator?.locks
  if (locks?.request !== undefined) return locks.request(LOCK_NAME, task)
  if (processLock) return undefined
  processLock = true
  try {
    return await task()
  } finally {
    processLock = false
  }
}

export async function pushPending(): Promise<number> {
  const deviceId = await getDeviceId()
  let pushed = 0
  for (;;) {
    const batch = await listOutbox(BATCH_SIZE)
    if (batch.length === 0) break
    const result = await apiJson<PushResult>('/api/v1/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        changes: batch.map(toPushChange),
      }),
    })
    const settled = batch.filter(
      (item) =>
        result.applied.some((entry) => entry.entity === item.entity && entry.id === item.id) ||
        result.conflicts.some((entry) => entry.entity === item.entity && entry.id === item.id),
    )
    if (settled.length > 0) {
      await deleteOutboxItems(settled.map((item) => item.seq as number))
    }
    pushed += settled.length
    if (settled.length === 0) break
  }
  return pushed
}

export async function pullAll(): Promise<number> {
  let cursor = await getLastPullCursor()
  let downloaded = 0
  for (;;) {
    const before = cursor
    const page = await apiJson<PullResult>(`/api/v1/sync/pull?cursor=${cursor}&limit=${PULL_LIMIT}`)
    for (const change of page.changes) {
      await applyRemoteChange(change)
    }
    downloaded += page.changes.length
    cursor = Math.max(cursor, page.nextCursor)
    await setLastPullCursor(cursor)
    updateSyncState({ downloaded })
    if (!page.hasMore || (page.changes.length === 0 && cursor <= before)) break
  }
  if (downloaded > 0) await recalcAfterPull()
  return downloaded
}

/** 2 s, 4 s, 8 s... limitado a 5 min (seção 4.5). */
export function backoffDelay(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** Math.max(0, attempt))
}

function scheduleRetry(): void {
  const delay = backoffDelay(failures)
  failures += 1
  if (retryTimer !== undefined) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    void runSync()
  }, delay)
}

function resetBackoff(): void {
  failures = 0
  if (retryTimer !== undefined) clearTimeout(retryTimer)
  retryTimer = undefined
}

/** Gatilho extra onde o navegador oferece Background Sync (iOS não oferece). */
async function registerBackgroundSync(): Promise<void> {
  const registration = await globalThis.navigator?.serviceWorker?.ready
  const manager = (
    registration as
      (ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }) | undefined
  )?.sync
  if (manager === undefined) return
  try {
    await manager.register('emagreser-sync')
  } catch {
    // Sem suporte o app continua pelos gatilhos normais.
  }
}

async function synchronize(): Promise<boolean> {
  const hadSession = isAuthenticated()
  try {
    await pushPending()
    await pullAll()
    const pending = await countOutbox()
    updateSyncState({ status: pending > 0 ? 'pending' : 'synced', downloaded: 0 })
    resetBackoff()
    void registerBackgroundSync()
    return true
  } catch (error) {
    updateSyncState({ downloaded: 0 })
    if (error instanceof AuthRequiredError) {
      // A fila e os dados locais ficam intactos até o mesmo usuário entrar.
      // Sem sessão prévia é apenas um aparelho novo, não uma expiração.
      updateSyncState({ status: 'pending', authRequired: hadSession })
      return false
    }
    if (!isOnline()) {
      updateSyncState({ status: 'offline' })
      return false
    }
    updateSyncState({ status: 'pending' })
    scheduleRetry()
    return false
  }
}

export async function runSync(): Promise<boolean> {
  if (!isOnline()) {
    updateSyncState({ status: 'offline', downloaded: 0 })
    return false
  }
  const result = await withSyncLock(synchronize)
  return result ?? false
}

/** Depois do login o cursor volta a zero: download completo para este usuário. */
export async function resetSyncForLogin(): Promise<void> {
  await setLastPullCursor(0)
  resetBackoff()
  updateSyncState({ authRequired: false })
  await runSync()
}

export function startSync(): () => void {
  registerSyncTrigger(() => {
    void runSync()
  })
  const onOnline = () => {
    resetBackoff()
    void runSync()
  }
  const onOffline = () => updateSyncState({ status: 'offline', downloaded: 0 })
  const onVisible = () => {
    if (globalThis.document?.visibilityState === 'visible') void runSync()
  }
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_NOW') void runSync()
  }
  globalThis.addEventListener?.('online', onOnline)
  globalThis.addEventListener?.('offline', onOffline)
  globalThis.addEventListener?.('message', onMessage as EventListener)
  globalThis.document?.addEventListener?.('visibilitychange', onVisible)
  const interval = setInterval(onOnline, PERIOD_MS)
  void runSync()

  return () => {
    cancelPendingWrite()
    unregisterSyncTrigger()
    globalThis.removeEventListener?.('online', onOnline)
    globalThis.removeEventListener?.('offline', onOffline)
    globalThis.removeEventListener?.('message', onMessage as EventListener)
    globalThis.document?.removeEventListener?.('visibilitychange', onVisible)
    clearInterval(interval)
    resetBackoff()
  }
}
