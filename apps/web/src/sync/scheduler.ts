/**
 * Ponte mínima entre a camada de dados e o motor de sincronização. A fila de
 * saída só avisa que houve escrita; quem decide quando sincronizar é o motor.
 * Isso evita dependência circular entre `data/outbox` e `sync/engine`.
 */

const WRITE_DEBOUNCE_MS = 2_000

type Trigger = () => void

let trigger: Trigger | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export function registerSyncTrigger(callback: Trigger): void {
  trigger = callback
}

export function unregisterSyncTrigger(): void {
  trigger = null
}

export function notifyLocalWrite(): void {
  if (trigger === null) return
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    trigger?.()
  }, WRITE_DEBOUNCE_MS)
}

export function cancelPendingWrite(): void {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
}
