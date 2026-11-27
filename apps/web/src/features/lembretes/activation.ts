/**
 * RF-41: fluxo reutilizável de ativação do lembrete. A permissão é pedida
 * dentro do gesto do usuário, antes de qualquer requisição assíncrona.
 */
import { saveSettings } from '../../data/settings'
import { needsInstallNotice } from './ios'
import {
  currentSubscription,
  fetchPublicKey,
  registerSubscription,
  subscribeLocal,
  unregisterSubscription,
  unsubscribeLocal,
  type PushSubscriptionPayload,
} from './subscription'

export type ReminderStatus =
  'active' | 'off' | 'denied' | 'unsupported' | 'requires-install' | 'unavailable' | 'error'

export interface NotificationApi {
  readonly permission: NotificationPermission
  requestPermission(): Promise<NotificationPermission>
}

export interface ActivationDeps {
  notification: NotificationApi | undefined
  iosInstallRequired: boolean
  publicKey(): Promise<string>
  subscribe(key: string): Promise<PushSubscriptionPayload | undefined>
  register(subscription: PushSubscriptionPayload): Promise<void>
  enable(): Promise<void>
}

export async function activateReminder(deps: ActivationDeps): Promise<ReminderStatus> {
  if (deps.notification === undefined) return 'unsupported'
  if (deps.iosInstallRequired) return 'requires-install'

  let permission = deps.notification.permission
  if (permission === 'default') permission = await deps.notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const key = await deps.publicKey()
  if (key === '') return 'unavailable'
  const subscription = await deps.subscribe(key)
  if (subscription === undefined) return 'unsupported'
  await deps.register(subscription)
  await deps.enable()
  return 'active'
}

export function browserActivationDeps(): ActivationDeps {
  return {
    notification: typeof Notification === 'undefined' ? undefined : Notification,
    iosInstallRequired: needsInstallNotice(),
    publicKey: fetchPublicKey,
    subscribe: subscribeLocal,
    register: registerSubscription,
    enable: async () => {
      await saveSettings({ reminderEnabled: true })
    },
  }
}

export function hasGrantedPermission(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export async function activate(): Promise<ReminderStatus> {
  try {
    return await activateReminder(browserActivationDeps())
  } catch {
    return 'error'
  }
}

export interface DeactivationDeps {
  local(): Promise<PushSubscriptionPayload | undefined>
  unsubscribeLocal(): Promise<void>
  unregister(endpoint?: string): Promise<void>
  disable(): Promise<void>
}

export async function deactivateReminder(deps: DeactivationDeps): Promise<void> {
  const subscription = await deps.local()
  await deps.unsubscribeLocal()
  await deps.unregister(subscription?.endpoint)
  await deps.disable()
}

export function browserDeactivationDeps(): DeactivationDeps {
  return {
    local: currentSubscription,
    unsubscribeLocal,
    unregister: unregisterSubscription,
    disable: async () => {
      await saveSettings({ reminderEnabled: false })
    },
  }
}

export async function deactivate(): Promise<ReminderStatus> {
  try {
    await deactivateReminder(browserDeactivationDeps())
    return 'off'
  } catch {
    return 'error'
  }
}

/** RF-38: sair da conta remove a inscrição sem mexer nas configurações locais. */
export async function unregisterOnSignOut(): Promise<void> {
  try {
    const subscription = await currentSubscription()
    await unregisterSubscription(subscription?.endpoint)
    await unsubscribeLocal()
  } catch {
    // Sem rede a sessão termina só no aparelho; a inscrição expira no servidor.
  }
}
