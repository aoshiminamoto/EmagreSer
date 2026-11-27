/** RF-26: percentual de dias cumpridos na janela de hábitos. */
import type { CalendarDate, HabitLog } from '../../data/entities'
import { lastCalendarDays } from './dates'

export const HISTORY_DAYS = 30

/**
 * Um dia é cumprido quando todos os hábitos ativos têm log `done` na data.
 * Dias sem marcação não entram no numerador (D-60).
 */
export function habitCompletionPercent(
  logs: readonly HabitLog[],
  activeHabitIds: readonly string[],
  today: CalendarDate,
  windowDays: number = HISTORY_DAYS,
): number {
  if (activeHabitIds.length === 0 || windowDays < 1) return 0
  const doneByDate = new Map<CalendarDate, Set<string>>()
  for (const log of logs) {
    if (log.deleted === true || !log.done) continue
    const done = doneByDate.get(log.date) ?? new Set<string>()
    done.add(log.habitId)
    doneByDate.set(log.date, done)
  }
  const days = lastCalendarDays(today, windowDays)
  const fulfilled = days.filter((date) => {
    const done = doneByDate.get(date)
    return done !== undefined && activeHabitIds.every((id) => done.has(id))
  }).length
  return Math.round((fulfilled / days.length) * 100)
}
