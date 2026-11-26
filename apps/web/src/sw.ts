/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

interface PushPayload {
  title?: string
  body?: string
  lang?: string
  url?: string
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }),
)

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
  const payload = (event.data?.json() ?? {}) as PushPayload
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'EmagreSer', {
      body: payload.body ?? '',
      lang: payload.lang ?? 'pt-BR',
      icon: '/icons/icon-192.png',
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as PushPayload | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const current = windows.find((window) => 'focus' in window)
      return current ? current.focus() : self.clients.openWindow(url)
    }),
  )
})
