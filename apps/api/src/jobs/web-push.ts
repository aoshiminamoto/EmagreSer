/** Envio real com web-push; VAPID vem só das variáveis de ambiente. */
import webpush from 'web-push'
import { config } from '../config.js'
import type { PushSender } from './reminders.js'

export function webPushSender(): PushSender {
  let configured = false
  return {
    async send(subscription, payload, ttlSeconds) {
      if (!configured) {
        webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey)
        configured = true
      }
      const result = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
        { TTL: ttlSeconds },
      )
      return { statusCode: result.statusCode }
    },
  }
}
