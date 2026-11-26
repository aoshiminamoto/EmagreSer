import { addDays } from './dates.js'
import type { CalendarDate, WeightEntry } from './types.js'

const WINDOW_DAYS = 7

function active(entries: readonly WeightEntry[]): WeightEntry[] {
  return entries.filter((entry) => entry.deleted !== true)
}

/** Peso de referência (RN-02): o registro mais recente, não a média. */
export function latestWeight(entries: readonly WeightEntry[]): WeightEntry | null {
  let latest: WeightEntry | null = null
  for (const entry of active(entries)) {
    // Em empate de data, vale a última ocorrência recebida.
    if (latest === null || entry.date >= latest.date) latest = entry
  }
  return latest
}

/**
 * RN-01: média aritmética dos registros nos 7 dias terminados em `endDate`.
 * Dias sem registro são ignorados; null quando a janela está vazia.
 */
export function movingAverageAt(
  entries: readonly WeightEntry[],
  endDate: CalendarDate,
): number | null {
  const startDate = addDays(endDate, -(WINDOW_DAYS - 1))
  const inWindow = active(entries).filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  )
  if (inWindow.length === 0) return null
  const total = inWindow.reduce((sum, entry) => sum + entry.weightKg, 0)
  return total / inWindow.length
}

/** Série do gráfico: uma média para cada data que possui registro. */
export function movingAverages(
  entries: readonly WeightEntry[],
): Array<{ date: CalendarDate; average: number }> {
  const dates = [...new Set(active(entries).map((entry) => entry.date))].sort()
  const series: Array<{ date: CalendarDate; average: number }> = []
  for (const date of dates) {
    const average = movingAverageAt(entries, date)
    if (average !== null) series.push({ date, average })
  }
  return series
}

/**
 * RN-05: subida quando o novo peso passa o registro anterior ou a média
 * móvel calculada sem ele. `previousEntries` não inclui o novo registro.
 */
export function isWeightIncrease(
  entry: WeightEntry,
  previousEntries: readonly WeightEntry[],
): boolean {
  const before = previousEntries.filter(
    (previous) => previous.deleted !== true && previous.date < entry.date,
  )
  const previous = latestWeight(before)
  if (previous !== null && entry.weightKg > previous.weightKg) return true
  const average = movingAverageAt(before, entry.date)
  return average !== null && entry.weightKg > average
}
