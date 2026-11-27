import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { pool, query } from '../db/pool.js'
import { runMigrations } from '../db/migrate.js'
import { reminderTextFor } from '../i18n/index.js'
import { buildReminderPayload, REMINDER_TTL_SECONDS } from './payload.js'
import { BullMQReminderQueue } from './queue.js'
import {
  createReminderService,
  type PushSender,
  type PushSubscriptionRecord,
  type ReminderQueue,
} from './reminders.js'

class FakeQueue implements ReminderQueue {
  readonly upserts: Array<{ userId: string; pattern: string; timezone: string }> = []
  readonly removed: string[] = []

  async upsert(userId: string, pattern: string, timezone: string): Promise<void> {
    this.upserts.push({ userId, pattern, timezone })
  }

  async remove(userId: string): Promise<void> {
    this.removed.push(userId)
  }
}

function fakeSender(
  deliver: (subscription: PushSubscriptionRecord) => Promise<void> = async () => {},
): {
  sender: PushSender
  calls: Array<{ payload: string; ttl: number }>
} {
  const calls: Array<{ payload: string; ttl: number }> = []
  return {
    calls,
    sender: {
      async send(subscription, payload, ttl) {
        calls.push({ payload, ttl })
        await deliver(subscription)
        return { statusCode: 200 }
      },
    },
  }
}

interface SettingsOverrides {
  locale?: string
  enabled?: boolean
  time?: string
  days?: number[]
  timezone?: string
  email?: string
}

async function createUser(
  overrides: SettingsOverrides = {},
): Promise<{ userId: string; email: string }> {
  const userId = randomUUID()
  const email = overrides.email ?? `user-${randomUUID()}@example.com`
  await query(
    `INSERT INTO users (id, email, password_hash, consent_at) VALUES ($1, $2, 'hash', now())`,
    [userId, email],
  )
  await query(
    `INSERT INTO user_settings
       (user_id, reminder_enabled, reminder_time, reminder_days, timezone, locale,
        client_updated_at, change_seq)
     VALUES ($1, $2, $3, $4, $5, $6, now(), nextval('change_seq'))`,
    [
      userId,
      overrides.enabled ?? true,
      overrides.time ?? '07:30',
      overrides.days ?? [1, 2, 3, 4, 5, 6, 7],
      overrides.timezone ?? 'America/Sao_Paulo',
      overrides.locale ?? 'pt-BR',
    ],
  )
  return { userId, email }
}

async function addSubscription(userId: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, 'p256dh', 'auth') RETURNING id`,
    [userId, `https://push.example.com/${randomUUID()}`],
  )
  return rows[0].id
}

beforeAll(async () => {
  await runMigrations()
}, 30000)

beforeEach(async () => {
  await query(
    `TRUNCATE users, user_settings, weight_entries, push_subscriptions RESTART IDENTITY CASCADE`,
  )
  await query(`UPDATE feature_flags SET state = 'off', rollout_percent = 0, tester_emails = '{}'`)
})

afterAll(async () => {
  await pool.end()
})

describe('job de lembrete (RF-37/RF-39/RF-40)', () => {
  it('cria e recria o agendador quando horário, dias ou fuso mudam', async () => {
    const { userId } = await createUser()
    const queue = new FakeQueue()
    const service = createReminderService({
      queue,
      sender: fakeSender().sender,
      appOrigin: 'https://app.example.com',
    })

    await service.schedule(userId)
    await query(
      `UPDATE user_settings SET reminder_time = '09:15', reminder_days = '{1,3,5}' WHERE user_id = $1`,
      [userId],
    )
    await service.schedule(userId)

    expect(queue.upserts).toEqual([
      { userId, pattern: '30 7 * * *', timezone: 'America/Sao_Paulo' },
      { userId, pattern: '15 9 * * 1,3,5', timezone: 'America/Sao_Paulo' },
    ])
  })

  it('cancela o job quando o lembrete é desativado', async () => {
    const { userId } = await createUser({ enabled: false })
    const queue = new FakeQueue()
    const service = createReminderService({
      queue,
      sender: fakeSender().sender,
      appOrigin: 'https://app.example.com',
    })

    await service.schedule(userId)
    await service.cancel(userId)

    expect(queue.upserts).toHaveLength(0)
    expect(queue.removed).toEqual([userId, userId])
  })

  it('não envia quando já existe peso na data civil do usuário', async () => {
    const { userId } = await createUser()
    await addSubscription(userId)
    await query(
      `INSERT INTO weight_entries (id, user_id, date, weight_kg, client_updated_at, change_seq)
       VALUES ($1, $2, '2026-11-25', 80, now(), nextval('change_seq'))`,
      [randomUUID(), userId],
    )
    const { sender, calls } = fakeSender()
    const service = createReminderService({
      queue: new FakeQueue(),
      sender,
      appOrigin: 'https://app.example.com',
    })

    // 02:00 UTC ainda é 25/11 em São Paulo (RN-08).
    const result = await service.dispatch(userId, new Date('2026-11-26T02:00:00.000Z'))

    expect(result).toEqual({ sent: 0, skipped: 1, expired: 0 })
    expect(calls).toHaveLength(0)
  })

  it('envia o payload no idioma efetivo com TTL de 6 horas e sem dado de saúde', async () => {
    const { userId } = await createUser({ locale: 'en-US' })
    await query(`UPDATE feature_flags SET state = 'on' WHERE key = 'i18n_en'`)
    await addSubscription(userId)
    const { sender, calls } = fakeSender()
    const service = createReminderService({
      queue: new FakeQueue(),
      sender,
      appOrigin: 'https://app.example.com/',
    })

    const result = await service.dispatch(userId, new Date('2026-11-26T12:00:00.000Z'))

    expect(result).toEqual({ sent: 1, skipped: 0, expired: 0 })
    expect(calls).toHaveLength(1)
    expect(calls[0].ttl).toBe(REMINDER_TTL_SECONDS)
    const payload = JSON.parse(calls[0].payload) as Record<string, unknown>
    expect(payload).toEqual(
      buildReminderPayload({
        ...reminderTextFor('en-US', Math.floor(Date.parse('2026-11-26T00:00:00Z') / 86_400_000)),
        locale: 'en-US',
        appOrigin: 'https://app.example.com',
      }),
    )
  })

  it('remove inscrições que respondem 404 ou 410', async () => {
    const { userId } = await createUser()
    const expiredId = await addSubscription(userId)
    const aliveId = await addSubscription(userId)
    const { sender, calls } = fakeSender(async (subscription) => {
      if (subscription.id === expiredId) {
        throw Object.assign(new Error('push failed'), { statusCode: 410 })
      }
    })
    const service = createReminderService({
      queue: new FakeQueue(),
      sender,
      appOrigin: 'https://app.example.com',
    })

    const result = await service.dispatch(userId, new Date('2026-11-26T12:00:00.000Z'))

    expect(result).toEqual({ sent: 1, skipped: 0, expired: 1 })
    expect(calls).toHaveLength(2)
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    )
    expect(rows.map((row) => row.id)).toEqual([aliveId])
  })

  it('respeita os dias da semana no fuso do usuário', async () => {
    const { userId } = await createUser({ days: [1, 2, 3, 4, 5] })
    const { sender, calls } = fakeSender()
    const service = createReminderService({
      queue: new FakeQueue(),
      sender,
      appOrigin: 'https://app.example.com',
    })

    // 29/11/2026 é domingo em UTC, mas 28/11 (sábado) em São Paulo às 02:00.
    const result = await service.dispatch(userId, new Date('2026-11-29T02:00:00.000Z'))

    expect(result.skipped).toBe(1)
    expect(calls).toHaveLength(0)
  })
})

describe('fila BullMQ (RF-37)', () => {
  it('persiste e remove o agendador repetível no Redis', async () => {
    const { userId } = await createUser()
    const queue = new BullMQReminderQueue()
    try {
      await queue.upsert(userId, '30 7 * * 1,2,3', 'America/Sao_Paulo')
      const found = (await queue.list()).find((scheduler) => scheduler.id === `reminder:${userId}`)
      expect(found).toMatchObject({ pattern: '30 7 * * 1,2,3', tz: 'America/Sao_Paulo' })
      await queue.remove(userId)
      expect(
        (await queue.list()).find((scheduler) => scheduler.id === `reminder:${userId}`),
      ).toBeUndefined()
    } finally {
      await queue.close()
    }
  })
})
