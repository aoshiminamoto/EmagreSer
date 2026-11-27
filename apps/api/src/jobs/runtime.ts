/** Runtime do worker: singleton por processo, com injeção para testes. */
import { config } from '../config.js'
import { BullMQReminderQueue, closeWorker, startReminderWorker } from './queue.js'
import { createReminderService, type ReminderService } from './reminders.js'
import { webPushSender } from './web-push.js'

let service: ReminderService | undefined
let worker: Awaited<ReturnType<typeof startReminderWorker>> | undefined

export function reminderService(): ReminderService {
  service ??= createReminderService({
    queue: new BullMQReminderQueue(),
    sender: webPushSender(),
    appOrigin: config.appOrigin,
  })
  return service
}

/** O worker só existe quando há par VAPID; em dev/teste o job pode ser inspecionado sem envio. */
export function startWorker(): void {
  if (config.vapidPublicKey === '' || config.vapidPrivateKey === '') return
  worker = startReminderWorker(reminderService())
}

export function setReminderServiceForTests(next: ReminderService): void {
  service = next
}

export async function closeReminderRuntime(): Promise<void> {
  await closeWorker(worker)
  worker = undefined
  await service?.close?.()
  service = undefined
}
