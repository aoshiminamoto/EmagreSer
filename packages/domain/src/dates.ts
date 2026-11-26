import type { CalendarDate } from './types.js'

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

function partsOf(date: CalendarDate): [number, number, number] {
  if (!isValidCalendarDate(date)) {
    throw new RangeError('Invalid calendar date')
  }
  const match = PATTERN.exec(date)
  if (match === null) {
    throw new RangeError('Invalid calendar date')
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Valida uma data de calendário existente, incluindo anos bissextos. */
export function isValidCalendarDate(value: string): boolean {
  const match = PATTERN.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** Soma (ou subtrai) dias civis sem depender do fuso do aparelho. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [year, month, day] = partsOf(date)
  const result = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY)
  return `${String(result.getUTCFullYear()).padStart(4, '0')}-${pad(
    result.getUTCMonth() + 1,
  )}-${pad(result.getUTCDate())}`
}

/** Diferença em dias civis: positiva quando `to` vem depois de `from`. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const [fromYear, fromMonth, fromDay] = partsOf(from)
  const [toYear, toMonth, toDay] = partsOf(to)
  const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const toMs = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((toMs - fromMs) / MS_PER_DAY)
}

/**
 * Converte um instante na data civil do aparelho (RN-08).
 * O chamador fornece o instante; esta função nunca lê o relógio.
 */
export function calendarDateFromInstant(instant: Date): CalendarDate {
  return `${String(instant.getFullYear()).padStart(4, '0')}-${pad(
    instant.getMonth() + 1,
  )}-${pad(instant.getDate())}`
}
