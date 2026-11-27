/**
 * Série e indicadores da tela Evolução (RF-08 a RF-12). As regras são puras e
 * espelham RN-01/RN-02 de `packages/domain` (D-36: o web não importa o pacote).
 */
import type { CalendarDate, WeightEntry } from '../../data/entities'
import { addDays, latestWeight, movingAverageBefore, roundKg } from '../peso/weight'

export type TrendPeriod = '30d' | '90d' | '6m' | 'all'
export const TREND_PERIODS: readonly TrendPeriod[] = ['30d', '90d', '6m', 'all']

/** RF-09: seis meses são 180 dias civis; "tudo" começa no primeiro registro. */
const PERIOD_DAYS: Record<Exclude<TrendPeriod, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '6m': 180,
}

export interface TrendPoint {
  date: CalendarDate
  weightKg: number
  average: number
}

export interface TrendIndicators {
  currentKg: number | null
  averageKg: number | null
  totalChangeKg: number | null
  weekChangeKg: number | null
}

export function periodStart(
  period: TrendPeriod,
  entries: readonly WeightEntry[],
  today: CalendarDate,
): CalendarDate {
  if (period === 'all') {
    const dates = entries
      .filter((entry) => entry.deleted !== true)
      .map((entry) => entry.date)
      .sort()
    return dates[0] ?? today
  }
  return addDays(today, -(PERIOD_DAYS[period] - 1))
}

/** Pontos diários discretos com a média móvel de RN-01 em cada data. */
export function buildTrend(
  entries: readonly WeightEntry[],
  period: TrendPeriod,
  today: CalendarDate,
): TrendPoint[] {
  const start = periodStart(period, entries, today)
  const byDate = new Map<CalendarDate, number>()
  for (const entry of entries) {
    if (entry.deleted === true || entry.date < start || entry.date > today) continue
    byDate.set(entry.date, entry.weightKg)
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, weightKg]) => ({
      date,
      weightKg,
      average: movingAverageBefore(entries, date) ?? weightKg,
    }))
}

/** RF-12: a tendência só aparece com pelo menos dois registros no período. */
export function isTrendEmpty(points: readonly TrendPoint[]): boolean {
  return points.length < 2
}

/** RF-11: variações usam o peso de referência e janelas de 7 dias (RN-01/RN-02). */
export function trendIndicators(
  entries: readonly WeightEntry[],
  today: CalendarDate,
): TrendIndicators {
  const points = buildTrend(entries, 'all', today)
  const first = points[0]
  const last = points.at(-1)
  if (first === undefined || last === undefined) {
    return { currentKg: null, averageKg: null, totalChangeKg: null, weekChangeKg: null }
  }
  const average = movingAverageBefore(entries, last.date)
  const previousWeek = movingAverageBefore(entries, addDays(last.date, -7))
  return {
    currentKg: latestWeight(entries)?.weightKg ?? null,
    averageKg: average,
    totalChangeKg: roundKg(last.weightKg - first.weightKg),
    weekChangeKg:
      average !== null && previousWeek !== null ? roundKg(average - previousWeek) : null,
  }
}
