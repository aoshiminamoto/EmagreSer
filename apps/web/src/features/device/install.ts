/**
 * RN-12: captura de beforeinstallprompt no carregamento inicial e regras do
 * convite de instalação. O evento é guardado até um gesto do usuário chamar prompt().
 */
import { getMeta, setMeta } from '../../data/meta'
import { isInstalledApp } from './detection'

export const INSTALL_DISMISS_KEY = 'installPromptDismissedAt'
export const INSTALL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

export interface InstallPromptLike {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallEvent = Event & InstallPromptLike

let deferred: InstallEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** Registrado em main.ts, antes de montar o app, para não perder o evento. */
export function captureInstallPrompt(): void {
  globalThis.addEventListener?.('beforeinstallprompt', (event) => {
    const prompt = event as InstallEvent
    if (typeof prompt.prompt !== 'function') return
    event.preventDefault()
    deferred = prompt
    notify()
  })
  globalThis.addEventListener?.('appinstalled', () => {
    installed = true
    deferred = null
    notify()
  })
}

export function onInstallStateChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getInstallPrompt(): InstallPromptLike | null {
  return deferred
}

export function isInstalled(): boolean {
  return installed || isInstalledApp()
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

/** Chamada só a partir do clique no banner (gesto do usuário). */
export async function promptInstall(): Promise<InstallOutcome> {
  if (deferred === null) return 'unavailable'
  const event = deferred
  deferred = null
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') installed = true
  notify()
  return outcome
}

export function dismissedRecently(
  dismissedAt: number | undefined,
  now: number = Date.now(),
): boolean {
  return dismissedAt !== undefined && now - dismissedAt < INSTALL_COOLDOWN_MS
}

export function getInstallDismissedAt(): Promise<number | undefined> {
  return getMeta<number>(INSTALL_DISMISS_KEY)
}

export async function dismissInstallPrompt(now: number = Date.now()): Promise<void> {
  await setMeta(INSTALL_DISMISS_KEY, now)
}
