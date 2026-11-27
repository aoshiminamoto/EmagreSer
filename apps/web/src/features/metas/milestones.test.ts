import { describe, expect, it } from 'vitest'
import {
  generateMilestones,
  progressPercent as domainProgressPercent,
} from '../../../../../packages/domain/src/goals.js'
import type { Milestone } from '../../data/entities'
import { nextPendingMilestone, progressPercent, selectCelebration } from './milestones'

function milestone(milestoneKg: number, extra: Partial<Milestone> = {}): Milestone {
  return {
    id: `m-${milestoneKg}`,
    milestoneKg,
    updatedAt: '2026-11-26T10:00:00.000Z',
    ...extra,
  }
}

describe('próximo marco (RF-13)', () => {
  it('é o pendente mais próximo abaixo do peso de referência', () => {
    const milestones = [milestone(86), milestone(82), milestone(80)]
    expect(nextPendingMilestone(milestones, 83)?.milestoneKg).toBe(82)
    expect(nextPendingMilestone(milestones, 81)?.milestoneKg).toBe(80)
  })

  it('ignora marcos alcançados, excluídos e acima do peso atual', () => {
    const milestones = [
      milestone(86, { achievedDate: '2026-01-01' }),
      milestone(82, { deleted: true }),
      milestone(80),
    ]
    expect(nextPendingMilestone(milestones, 84)?.milestoneKg).toBe(80)
    expect(nextPendingMilestone(milestones, 79)).toBeUndefined()
  })
})

describe('progresso (RN-04)', () => {
  it('espelha o domínio e limita entre 0% e 100%', () => {
    for (const current of [95, 90, 85, 80, 70]) {
      expect(progressPercent(90, current, 80)).toBe(domainProgressPercent(90, current, 80))
    }
    expect(progressPercent(90, 95, 80)).toBe(0)
    expect(progressPercent(90, 70, 80)).toBe(100)
    expect(progressPercent(90, 90, 90)).toBe(100)
    expect(generateMilestones(90, 80, 4)).toEqual([86, 82, 80])
  })
})

describe('seleção da celebração (RF-14)', () => {
  it('destaca o marco mais distante quando vários são cruzados', () => {
    const milestones = [
      milestone(86, { achievedDate: '2026-01-01', celebrated: true }),
      milestone(82, { achievedDate: '2026-01-10' }),
      milestone(80, { achievedDate: '2026-01-10' }),
    ]
    expect(selectCelebration(milestones)).toEqual({ milestoneKg: 80, count: 2 })
  })

  it('não celebra marcos pendentes, excluídos ou já celebrados', () => {
    expect(
      selectCelebration([
        milestone(82),
        milestone(80, { achievedDate: '2026-01-10', deleted: true }),
        milestone(78, { achievedDate: '2026-01-10', celebrated: true }),
      ]),
    ).toBeNull()
  })
})
