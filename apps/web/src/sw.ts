/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

interface DeclarativeNotification {
  title?: string
  body?: string
  lang?: string
  dir?: string
  navigate?: string
  silent?: boolean
}

/** RF-40: Chrome e Firefox também recebem o JSON do Declarative Web Push. */
interface PushPayload {
  web_push?: number
  notification?: DeclarativeNotification
  /** Compatibilidade com inscrições antigas, que usavam o formato simples. */
  title?: string
  body?: string
  url?: string
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }),
)
clientsClaim()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

interface SyncEventLike extends Event {
  tag: string
  waitUntil(promise: Promise<unknown>): void
}

/** Background Sync é só um gatilho extra: o iOS não tem e o app não depende dele. */
self.addEventListener('sync', (event) => {
  const sync = event as SyncEventLike
  if (sync.tag !== 'emagreser-sync') return
  sync.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) client.postMessage({ type: 'SYNC_NOW' })
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = (event.data?.json() ?? {}) as PushPayload
  } catch {
    // Sem payload válido ainda é preciso mostrar algo para não perder a inscrição.
  }
  const notification = payload.notification ?? {}
  const title = notification.title ?? payload.title ?? 'EmagreSer'
  const options: NotificationOptions = {
    body: notification.body ?? payload.body ?? '',
    lang: notification.lang ?? 'pt-BR',
    dir: notification.dir === 'rtl' ? 'rtl' : 'ltr',
    silent: notification.silent ?? false,
    icon: '/icons/icon-192.png',
    data: { url: notification.navigate ?? payload.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { url?: string } | undefined
  const url = data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const current = windows.find((window) => 'focus' in window) as WindowClient | undefined
      if (current !== undefined) return current.navigate(url).then(() => current.focus())
      return self.clients.openWindow(url)
    }),
  )
})
