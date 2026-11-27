/**
 * RF-27/RF-28: opções de humor e distribuição dos últimos 30 dias.
 * Regra pura: o "hoje" civil vem de parâmetro (RN-08).
 */
import type { CalendarDate, Mood, WeightEntry } from '../../data/entities'
import { addDays } from '../peso/weight'

export const MOODS: readonly Mood[] = ['feliz', 'ansioso', 'cansado', 'estressado']
export const MOOD_WINDOW_DAYS = 30

export interface MoodDistribution extends Record<Mood, number> {
  total: number
}

export function moodDistribution(
  entries: readonly WeightEntry[],
  today: CalendarDate,
  days: number = MOOD_WINDOW_DAYS,
): MoodDistribution {
  const start = addDays(today, -(days - 1))
  const result: MoodDistribution = {
    feliz: 0,
    ansioso: 0,
    cansado: 0,
    estressado: 0,
    total: 0,
  }
  for (const entry of entries) {
    if (entry.deleted === true || entry.mood === undefined) continue
    if (entry.date < start || entry.date > today) continue
    result[entry.mood] += 1
    result.total += 1
  }
  return result
}
