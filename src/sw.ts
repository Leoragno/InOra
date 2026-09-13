/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

// Notifiche push — porting dello handler della vecchia app: riceve il
// payload {title, body, url} inviato da send-push (Edge Function) e mostra
// la notifica di sistema; al tap apre/mette a fuoco l'app sull'url indicato.
self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }
  const title = payload.title || 'JOB'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
