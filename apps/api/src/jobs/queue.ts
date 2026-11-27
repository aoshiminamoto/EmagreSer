/** Fila BullMQ do worker de lembretes: um agendador repetível por usuário. */
import { Queue, Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { config } from '../config.js'
import { schedulerId } from './schedule.js'
import type { ReminderQueue, ReminderService } from './reminders.js'

const QUEUE_NAME = 'emagreser-reminders'

export interface ScheduledReminder {
  id: string
  pattern: string
  tz?: string
}

function connection(): Redis {
  // BullMQ exige maxRetriesPerRequest nulo para conexões de blocking do worker.
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null })
}

export class BullMQReminderQueue implements ReminderQueue {
  private readonly client = connection()
  private readonly queue = new Queue(QUEUE_NAME, { connection: this.client })

  async upsert(userId: string, pattern: string, timezone: string): Promise<void> {
    await this.queue.upsertJobScheduler(
      schedulerId(userId),
      { pattern, tz: timezone },
      { name: 'send', data: { userId } },
    )
  }

  async remove(userId: string): Promise<void> {
    await this.queue.removeJobScheduler(schedulerId(userId))
  }

  async list(): Promise<ScheduledReminder[]> {
    const schedulers = await this.queue.getJobSchedulers()
    return schedulers.map((scheduler) => ({
      id: scheduler.key,
      pattern: scheduler.pattern ?? '',
      tz: scheduler.tz,
    }))
  }

  async close(): Promise<void> {
    await this.queue.close()
    this.client.disconnect()
  }
}

export function startReminderWorker(service: ReminderService): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<{ userId: string }>) => {
      await service.dispatch(job.data.userId)
    },
    { connection: connection() },
  )
  // Nenhum dado de saúde ou payload entra nos logs.
  worker.on('error', () => {})
  return worker
}

export async function closeWorker(worker: Worker | undefined): Promise<void> {
  if (worker === undefined) return
  await worker.close()
}
