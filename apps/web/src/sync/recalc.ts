/**
 * Recálculo posterior ao pull (RN-03 e RN-06). Espelha as regras puras de
 * `packages/domain` sem importar o pacote: o build do web roda antes dele e o
 * domínio não publica `.d.ts` (D-36).
 */
import { db } from '../data/db'
import type { CalendarDate, WeightEntry } from '../data/entities'
import { getMeta, setMeta } from '../data/meta'
import { putMilestone } from '../data/milestones'
import { getSettings } from '../data/settings'

export interface StreakSnapshot {
  current: number
  best: number
}

const MAX_MILESTONES = 200

function roundKg(value: number): number {
  return Math.round(value * 10) / 10
}

/** RN-03: de P−S até A, com o último marco sempre na meta. */
export function milestoneValues(startKg: number, targetKg: number, stepKg: number): number[] {
  if (!Number.isFinite(stepKg) || roundKg(stepKg) <= 0) throw new RangeError('Invalid step')
  if (startKg <= targetKg) return []
  const values: number[] = []
  let value = roundKg(startKg - stepKg)
  while (value > targetKg && values.length < MAX_MILESTONES) {
    values.push(value)
    value = roundKg(value - stepKg)
  }
  values.push(roundKg(targetKg))
  return values
}

/** RN-03: a data mais antiga com peso menor ou igual ao marco. */
export function achievedDateFor(
  milestoneKg: number,
  entries: readonly WeightEntry[],
): CalendarDate | undefined {
  const qualifying = entries
    .filter((entry) => entry.deleted !== true && entry.weightKg <= milestoneKg)
    .map((entry) => entry.date)
    .sort()
  return qualifying[0]
}

/** RN-06: a união das datas com qualquer ação, sem repetição e sem futuro. */
export function calculateLocalStreak(
  activityDates: readonly CalendarDate[],
  today: CalendarDate,
  previousBest = 0,
): StreakSnapshot {
  const dates = [...new Set(activityDates.filter((date) => date <= today))].sort()
  let best = 0
  let run = 0
  for (let index = 0; index < dates.length; index += 1) {
    const previous = dates[index - 1]
    run = previous !== undefined && dayDifference(previous, dates[index]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  const last = dates.at(-1)
  let current = 0
  if (last === today || (last !== undefined && dayDifference(last, today) === 1)) {
    current = 1
    for (let index = dates.length - 2; index >= 0; index -= 1) {
      if (dayDifference(dates[index], dates[index + 1]) !== 1) break
      current += 1
    }
  }
  return { current, best: Math.max(best, current, previousBest) }
}

function dayDifference(from: CalendarDate, to: CalendarDate): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

function todayCalendar(now: Date): CalendarDate {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Chamado depois de cada pull que trouxe alguma alteração. */
export async function recalcAfterPull(now: Date = new Date()): Promise<void> {
  const [settings, entries, allMilestones, habitLogs, waterLogs] = await Promise.all([
    getSettings(),
    db.weightEntries.toArray(),
    db.milestones.toArray(),
    db.habitLogs.toArray(),
    db.waterLogs.toArray(),
  ])

  if (
    settings !== undefined &&
    settings.startWeightKg !== undefined &&
    settings.targetWeightKg !== undefined &&
    settings.milestoneStepKg > 0
  ) {
    const values = milestoneValues(
      settings.startWeightKg,
      settings.targetWeightKg,
      settings.milestoneStepKg,
    )
    for (const milestoneKg of values) {
      const active = allMilestones.find(
        (milestone) => milestone.milestoneKg === milestoneKg && milestone.deleted !== true,
      )
      const achievedDate = achievedDateFor(milestoneKg, entries)
      if (active === undefined) {
        await putMilestone(
          { milestoneKg, ...(achievedDate === undefined ? {} : { achievedDate }) },
          now,
        )
      } else if (active.achievedDate !== achievedDate) {
        await putMilestone(
          { milestoneKg, ...(achievedDate === undefined ? {} : { achievedDate }) },
          now,
        )
      }
    }
  }

  const dates: CalendarDate[] = [
    ...entries.filter((entry) => entry.deleted !== true).map((entry) => entry.date),
    ...habitLogs.filter((log) => log.deleted !== true && log.done).map((log) => log.date),
    ...waterLogs.filter((log) => log.deleted !== true).map((log) => log.date),
  ]
  const previous = await getMeta<StreakSnapshot>('streak')
  const streak = calculateLocalStreak(dates, todayCalendar(now), previous?.best ?? 0)
  await setMeta('streak', streak)
}
