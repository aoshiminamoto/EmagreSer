/** RF-37: agendamento por usuário no fuso local, com um job repetível por conta. */

export const SCHEDULER_PREFIX = 'reminder:'

export function schedulerId(userId: string): string {
  return `${SCHEDULER_PREFIX}${userId}`
}

/** Dias ISO (1 = segunda ... 7 = domingo) viram dias cron (0 = domingo ... 6 = sábado). */
export function reminderCron(time: string, days: readonly number[]): string {
  // O tipo `time` do PostgreSQL devolve HH:mm:ss; o horário salvo é HH:mm.
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(time)
  if (match === null) throw new RangeError('INVALID_REMINDER_TIME')
  const [, hour = '0', minute = '0'] = match
  const selected = new Set(days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))
  const cronDays = [...selected].map((day) => (day === 7 ? 0 : day)).sort((a, b) => a - b)
  const dayField = cronDays.length === 0 || cronDays.length === 7 ? '*' : cronDays.join(',')
  return `${Number(minute)} ${Number(hour)} * * ${dayField}`
}

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/** Data civil no fuso do usuário (RN-08), sem depender do fuso do servidor. */
export function calendarDateInZone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: isValidTimeZone(timezone) ? timezone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

/** Dia ISO da semana para uma data YYYY-MM-DD (1 = segunda ... 7 = domingo). */
export function isoDayOfWeek(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

/** Dia-índice estável para sortear os textos sem repetir a cada minuto. */
export function dayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
}
