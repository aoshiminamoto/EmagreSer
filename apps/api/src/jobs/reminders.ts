/**
 * RF-37 a RF-40: agendamento, envio e limpeza de inscrições de lembrete.
 * O envio é injetável para que os testes não toquem o Web Push de verdade.
 */
import { query } from '../db/pool.js'
import { reminderTextFor } from '../i18n/index.js'
import { serverLocaleFor } from '../services/locale.js'
import { buildReminderPayload, REMINDER_TTL_SECONDS } from './payload.js'
import {
  calendarDateInZone,
  dayIndex,
  isoDayOfWeek,
  isValidTimeZone,
  reminderCron,
} from './schedule.js'

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSendResult {
  statusCode?: number
}

export interface PushSender {
  send(
    subscription: PushSubscriptionRecord,
    payload: string,
    ttlSeconds: number,
  ): Promise<PushSendResult>
}

export interface ReminderQueue {
  upsert(userId: string, pattern: string, timezone: string): Promise<void>
  remove(userId: string): Promise<void>
  close?(): Promise<void>
}

export interface DispatchResult {
  sent: number
  skipped: number
  expired: number
}

export interface ReminderService {
  /** Cria ou atualiza o job repetível; remove quando o lembrete está desligado. */
  schedule(userId: string): Promise<void>
  cancel(userId: string): Promise<void>
  dispatch(userId: string, now?: Date): Promise<DispatchResult>
  close?(): Promise<void>
}

interface SettingsRow {
  email: string
  reminder_enabled: boolean
  reminder_time: string
  reminder_days: number[] | string
  timezone: string
}

async function loadSettings(userId: string): Promise<SettingsRow | undefined> {
  const { rows } = await query<SettingsRow>(
    `SELECT u.email, s.reminder_enabled, s.reminder_time, s.reminder_days, s.timezone
       FROM user_settings s JOIN users u ON u.id = s.user_id WHERE s.user_id = $1`,
    [userId],
  )
  return rows[0]
}

function reminderDays(row: SettingsRow): number[] {
  return Array.isArray(row.reminder_days)
    ? row.reminder_days
    : String(row.reminder_days)
        .replace(/[{}]/g, '')
        .split(',')
        .filter((value) => value.trim() !== '')
        .map(Number)
}

function shouldSkipRow(row: SettingsRow, now: Date): boolean {
  if (!row.reminder_enabled) return true
  if (!isValidTimeZone(row.timezone)) return true
  const date = calendarDateInZone(now, row.timezone)
  return !reminderDays(row).includes(isoDayOfWeek(date))
}

export function createReminderService(options: {
  queue: ReminderQueue
  sender: PushSender
  appOrigin: string
}): ReminderService {
  async function schedule(userId: string): Promise<void> {
    const row = await loadSettings(userId)
    if (row === undefined || !row.reminder_enabled || !isValidTimeZone(row.timezone)) {
      await options.queue.remove(userId)
      return
    }
    await options.queue.upsert(
      userId,
      reminderCron(row.reminder_time, reminderDays(row)),
      row.timezone,
    )
  }

  async function cancel(userId: string): Promise<void> {
    await options.queue.remove(userId)
  }

  async function dispatch(userId: string, now: Date = new Date()): Promise<DispatchResult> {
    const result: DispatchResult = { sent: 0, skipped: 0, expired: 0 }
    const row = await loadSettings(userId)
    if (row === undefined || shouldSkipRow(row, now)) {
      result.skipped = 1
      return result
    }

    const localDate = calendarDateInZone(now, row.timezone)
    const { rows: weights } = await query<{ id: string }>(
      `SELECT id FROM weight_entries
        WHERE user_id = $1 AND date = $2 AND deleted_at IS NULL LIMIT 1`,
      [userId, localDate],
    )
    if (weights.length > 0) {
      result.skipped = 1
      return result
    }

    const locale = await serverLocaleFor(userId, row.email)
    const text = reminderTextFor(locale, dayIndex(localDate))
    const payload = JSON.stringify(
      buildReminderPayload({ ...text, locale, appOrigin: options.appOrigin }),
    )
    const { rows: subscriptions } = await query<PushSubscriptionRecord>(
      `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    )

    for (const subscription of subscriptions) {
      try {
        await options.sender.send(subscription, payload, REMINDER_TTL_SECONDS)
        result.sent += 1
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2`, [
            subscription.id,
            userId,
          ])
          result.expired += 1
        }
        // Sem mensagem nem payload no log: status numérico é suficiente.
      }
    }
    return result
  }

  return {
    schedule,
    cancel,
    dispatch,
    ...(options.queue.close === undefined
      ? {}
      : {
          close: async () => {
            await options.queue.close?.()
          },
        }),
  }
}
