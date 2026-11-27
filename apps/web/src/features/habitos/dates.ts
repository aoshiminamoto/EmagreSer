/** Aritmética civil espelhada de `packages/domain` (D-42), sem ler o relógio. */
import type { CalendarDate } from '../../data/entities'

const MS_PER_DAY = 86_400_000

function partsOf(date: CalendarDate): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (match === null) throw new RangeError('Invalid calendar date')
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Subtrai dias civis usando UTC, sem depender do fuso do aparelho. */
export function daysBefore(today: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = partsOf(today)
  const result = new Date(Date.UTC(year, month - 1, day) - days * MS_PER_DAY)
  return `${String(result.getUTCFullYear()).padStart(4, '0')}-${pad(
    result.getUTCMonth() + 1,
  )}-${pad(result.getUTCDate())}`
}

/** Janela que inclui o dia de hoje e os `count - 1` dias anteriores. */
export function lastCalendarDays(today: CalendarDate, count: number): CalendarDate[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Invalid window')
  return Array.from({ length: count }, (_, index) => daysBefore(today, count - 1 - index))
}
