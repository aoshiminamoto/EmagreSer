import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Milestone, WeightEntry } from '../data/entities'
import { listMilestones, setCelebrated } from '../data/milestones'
import { saveSettings } from '../data/settings'
import { putWeightEntry } from '../data/weights'
import { planMilestoneRegeneration, recalcAfterPull } from './recalc'

const now = new Date('2026-11-26T10:00:00.000Z')

function milestone(milestoneKg: number, extra: Partial<Milestone> = {}): Milestone {
  return { id: `m-${milestoneKg}`, milestoneKg, updatedAt: now.toISOString(), ...extra }
}

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, updatedAt: now.toISOString() }
}

describe('regeneração de marcos (RF-16)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('preserva alcançados e remove apenas pendentes fora da nova lista', () => {
    const existing = [milestone(86, { achievedDate: '2026-01-10' }), milestone(84), milestone(82)]
    expect(planMilestoneRegeneration([86, 82, 80], existing, [entry('2026-01-10', 86)])).toEqual({
      upserts: [{ milestoneKg: 80 }],
      stale: [existing[1]],
    })
  })

  it('ao editar o passo, recria a lista sem perder data, id e celebração', async () => {
    await saveSettings({ startWeightKg: 90, targetWeightKg: 80, milestoneStepKg: 2 }, now)
    await putWeightEntry({ date: '2026-01-10', weightKg: 86 }, now)
    await recalcAfterPull(now)

    const achieved = (await listMilestones()).find((item) => item.milestoneKg === 86)
    expect(achieved?.achievedDate).toBe('2026-01-10')
    if (achieved === undefined) throw new Error('marco não criado')
    await setCelebrated(achieved.id, true)

    await saveSettings({ milestoneStepKg: 5 }, now)
    await recalcAfterPull(now)

    // 88 também foi alcançado pelo peso 86; 84 e 82 eram pendentes e saem.
    expect((await listMilestones()).map((item) => item.milestoneKg)).toEqual([80, 85, 86, 88])
    expect(
      (await db.milestones.toArray())
        .filter((item) => item.deleted)
        .map((item) => item.milestoneKg)
        .sort((a, b) => a - b),
    ).toEqual([82, 84])
    const preserved = (await listMilestones()).find((item) => item.id === achieved.id)
    expect(preserved).toMatchObject({ achievedDate: '2026-01-10', celebrated: true })
  })
})
