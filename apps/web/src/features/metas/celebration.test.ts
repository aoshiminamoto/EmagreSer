import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { listMilestones, putMilestone, setCelebrated } from '../../data/milestones'
import { countOutbox } from '../../data/outbox'
import { celebration, dismissCelebration, evaluateCelebration } from './celebration'

describe('celebração única por marco (RF-14)', () => {
  beforeEach(async () => {
    dismissCelebration()
    await db.delete()
    await db.open()
  })

  it('marca todos os alcançados, destaca o mais distante e não repete', async () => {
    await putMilestone({ milestoneKg: 86, achievedDate: '2026-01-10' })
    await putMilestone({ milestoneKg: 82, achievedDate: '2026-01-12' })
    await putMilestone({ milestoneKg: 80 })
    const outboxBefore = await countOutbox()

    await evaluateCelebration()
    expect(celebration.value).toEqual({ milestoneKg: 82, count: 2 })
    expect((await listMilestones()).map((milestone) => milestone.celebrated)).toEqual([
      undefined,
      true,
      true,
    ])
    // O sinal é exclusivo do aparelho: não entra na fila de sincronização.
    expect(await countOutbox()).toBe(outboxBefore)

    dismissCelebration()
    await evaluateCelebration()
    expect(celebration.value).toBeNull()
  })

  it('não mostra celebração sem marcos recém-alcançados', async () => {
    const achieved = await putMilestone({ milestoneKg: 80, achievedDate: '2026-01-10' })
    await setCelebrated(achieved.id, true)
    await evaluateCelebration()
    expect(celebration.value).toBeNull()
  })
})
