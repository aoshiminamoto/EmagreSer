/**
 * RF-38: inscrição com window.pushManager (Safari 18.4+) quando existir e,
 * nos demais navegadores, com registration.pushManager do service worker.
 */
import { apiJson } from '../../net/auth-client'

export interface PushSubscriptionPayload {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const decoded = globalThis.atob(base64)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }
  return bytes
}

export async function fetchPublicKey(): Promise<string> {
  const data = await apiJson<{ publicKey: string }>('/api/v1/push/public-key', {}, { auth: false })
  return data.publicKey
}

async function pushManager(): Promise<PushManager | undefined> {
  const windowManager = (globalThis.window as (Window & { pushManager?: PushManager }) | undefined)
    ?.pushManager
  if (windowManager !== undefined) return windowManager
  const registration = await globalThis.navigator?.serviceWorker?.ready
  return registration?.pushManager
}

function toPayload(json: PushSubscriptionJSON): PushSubscriptionPayload | undefined {
  const { endpoint, keys } = json
  if (endpoint === undefined || keys?.p256dh === undefined || keys.auth === undefined) {
    return undefined
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
}

export async function subscribeLocal(
  publicKey: string,
): Promise<PushSubscriptionPayload | undefined> {
  const manager = await pushManager()
  if (manager === undefined) return undefined
  const subscription = await manager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  return toPayload(subscription.toJSON())
}

export async function currentSubscription(): Promise<PushSubscriptionPayload | undefined> {
  const manager = await pushManager()
  const subscription = await manager?.getSubscription()
  return subscription === undefined || subscription === null
    ? undefined
    : toPayload(subscription.toJSON())
}

export async function unsubscribeLocal(): Promise<void> {
  const subscription = await (await pushManager())?.getSubscription()
  if (subscription !== undefined && subscription !== null) await subscription.unsubscribe()
}

export async function registerSubscription(payload: PushSubscriptionPayload): Promise<void> {
  await apiJson<{ ok: boolean }>('/api/v1/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function unregisterSubscription(endpoint?: string): Promise<void> {
  await apiJson<{ ok: boolean }>('/api/v1/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    ...(endpoint === undefined ? {} : { body: JSON.stringify({ endpoint }) }),
  })
}
