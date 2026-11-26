// Formatação acontece só na apresentação. Datas e horas chegam como texto (YYYY-MM-DD, HH:mm).

export type DateStyle = 'short' | 'long' | 'monthYear'
export type NumberKind = 'decimal' | 'weight' | 'percent' | 'count'

function calendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// O fuso UTC mantém o dia do calendário, independente do fuso do aparelho.
export function formatDate(value: string, locale: string, style: DateStyle = 'short'): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : style === 'monthYear'
        ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
        : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale, options).format(calendarDate(value))
}

export function formatTime(
  value: string,
  locale: string,
  options: { hour12?: boolean } = {},
): string {
  const [hour, minute] = value.split(':').map(Number)
  const date = new Date(Date.UTC(1970, 0, 1, hour, minute))
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: options.hour12,
    timeZone: 'UTC',
  }).format(date)
}

export function formatRelative(value: string, locale: string, now: Date = new Date()): string {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((calendarDate(value).getTime() - today) / 86_400_000)
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(days) < 7) return relative.format(days, 'day')
  if (Math.abs(days) < 30) return relative.format(Math.trunc(days / 7), 'week')
  if (Math.abs(days) < 365) return relative.format(Math.trunc(days / 30), 'month')
  return relative.format(Math.trunc(days / 365), 'year')
}

export function formatNumber(value: number, locale: string, kind: NumberKind = 'decimal'): string {
  const options: Intl.NumberFormatOptions =
    kind === 'weight'
      ? {
          style: 'unit',
          unit: 'kilogram',
          unitDisplay: 'short',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }
      : kind === 'percent'
        ? { style: 'percent', maximumFractionDigits: 0 }
        : kind === 'count'
          ? { maximumFractionDigits: 0 }
          : { maximumFractionDigits: 2 }
  return new Intl.NumberFormat(locale, options).format(value)
}
