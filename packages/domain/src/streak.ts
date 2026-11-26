import { addDays, daysBetween } from './dates.js'
import type { CalendarDate } from './types.js'

export interface StreakResult {
  /** Dias seguidos até hoje (ou até ontem, se hoje ainda não tem ação). */
  current: number
  /** Maior sequência já registrada, preservando um recorde informado. */
  best: number
}

/**
 * RN-06 / RF-20 a RF-22: calcula o streak a partir da união das datas com
 * qualquer ação. Datas futuras são ignoradas; o resultado é recalculado do
 * zero a cada chamada, então edições retroativas são refletidas.
 */
export function calculateStreak(
  activityDates: readonly CalendarDate[],
  today: CalendarDate,
  previousBest = 0,
): StreakResult {
  const dates = [...new Set(activityDates.filter((date) => date <= today))].sort()

  let best = 0
  let run = 0
  for (let index = 0; index < dates.length; index += 1) {
    run = index > 0 && daysBetween(dates[index - 1], dates[index]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }

  const lastIndex = dates.length - 1
  const last = dates[lastIndex]
  let current = 0
  if (last === today || last === addDays(today, -1)) {
    current = 1
    for (let index = lastIndex - 1; index >= 0; index -= 1) {
      if (daysBetween(dates[index], dates[index + 1]) !== 1) break
      current += 1
    }
  }

  return { current, best: Math.max(best, current, previousBest) }
}
