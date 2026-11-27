/**
 * Regras puras de peso espelhadas de `packages/domain` (D-36: o web não importa
 * o pacote, que não publica `.d.ts` e compila depois dele).
 */
import type { CalendarDate, WeightEntry } from '../../data/entities'

const MS_PER_DAY = 86_400_000
const WINDOW_DAYS = 7
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const MIN_WEIGHT_KG = 20
export const MAX_WEIGHT_KG = 500

export function roundKg(value: number): number {
  return Math.round(value * 10) / 10
}

/** RN-16: aceita vírgula ou ponto; quando há os dois, o último é o decimal. */
export function parseDecimal(input: string): number | null {
  const text = input.trim()
  if (text === '') return null

  let decimalIndex = -1
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === ',' || char === '.') decimalIndex = index
  }
  const integerPart = decimalIndex === -1 ? text : text.slice(0, decimalIndex)
  const fractionPart = decimalIndex === -1 ? '' : text.slice(decimalIndex + 1)
  const digits = integerPart.replace(/[,.\s]/g, '')
  if (!/^[+-]?\d+$/.test(digits)) return null
  if (fractionPart !== '' && !/^\d+$/.test(fractionPart)) return null

  const value = Number(`${digits}${fractionPart === '' ? '' : `.${fractionPart}`}`)
  return Number.isFinite(value) ? value : null
}

export function isValidWeightKg(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG
}

/** Normaliza a entrada, valida o intervalo e limita a uma casa decimal. */
export function parseWeightKg(raw: string): number | null {
  const value = parseDecimal(raw)
  return value === null || !isValidWeightKg(value) ? null : roundKg(value)
}

export function adjustWeight(value: number, delta: number): number {
  return roundKg(value + delta)
}

export function isValidCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
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

/** RN-08: instante fornecido pelo chamador convertido para a data civil local. */
export function calendarDate(instant: Date): CalendarDate {
  const month = String(instant.getMonth() + 1).padStart(2, '0')
  const day = String(instant.getDate()).padStart(2, '0')
  return `${String(instant.getFullYear()).padStart(4, '0')}-${month}-${day}`
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  if (!isValidCalendarDate(date)) throw new RangeError('Invalid calendar date')
  const result = new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY)
  return `${String(result.getUTCFullYear()).padStart(4, '0')}-${String(
    result.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`
}

/** Positivo quando `to` vem depois de `from`, em dias civis. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  if (!isValidCalendarDate(from) || !isValidCalendarDate(to)) {
    throw new RangeError('Invalid calendar date')
  }
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY)
}

/** Vuetify usa 0 = domingo; pt-BR e es-419 começam na segunda. */
export function firstDayOfWeek(locale: string): number {
  return locale === 'en-US' ? 0 : 1
}

function active(entries: readonly WeightEntry[]): WeightEntry[] {
  return entries.filter((entry) => entry.deleted !== true)
}

/** RN-02: o registro mais recente, não a média. */
export function latestWeight(entries: readonly WeightEntry[]): WeightEntry | null {
  let latest: WeightEntry | null = null
  for (const entry of active(entries)) {
    if (latest === null || entry.date >= latest.date) latest = entry
  }
  return latest
}

/**
 * RF-02/RN-02: validar a meta contra o peso atual registrado, não contra o
 * peso inicial (que pode ter sido editado depois). O inicial é só fallback.
 */
export function targetReferenceKg(
  entries: readonly WeightEntry[],
  startWeightKg: number | undefined,
): number | null {
  return latestWeight(entries)?.weightKg ?? startWeightKg ?? null
}

/** RN-01: média dos 7 dias que terminam em `endDate`, sem preenchimento. */
export function movingAverageBefore(
  entries: readonly WeightEntry[],
  endDate: CalendarDate,
): number | null {
  const startDate = addDays(endDate, -(WINDOW_DAYS - 1))
  const inWindow = active(entries).filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  )
  if (inWindow.length === 0) return null
  return inWindow.reduce((sum, entry) => sum + entry.weightKg, 0) / inWindow.length
}

/** RN-05: `previousEntries` não inclui o novo registro. */
export function isWeightIncrease(
  entry: WeightEntry,
  previousEntries: readonly WeightEntry[],
): boolean {
  const before = previousEntries.filter(
    (previous) => previous.deleted !== true && previous.date < entry.date,
  )
  const previous = latestWeight(before)
  if (previous !== null && entry.weightKg > previous.weightKg) return true
  const average = movingAverageBefore(before, entry.date)
  return average !== null && entry.weightKg > average
}
