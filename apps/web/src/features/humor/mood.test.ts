import { describe, expect, it } from 'vitest'
import type { Mood, WeightEntry } from '../../data/entities'
import { moodDistribution } from './mood'

function entry(date: string, mood?: Mood, deleted = false): WeightEntry {
  return {
    id: date,
    date,
    weightKg: 70,
    updatedAt: '2026-11-26T00:00:00.000Z',
    ...(mood === undefined ? {} : { mood }),
    ...(deleted ? { deleted: true } : {}),
  }
}

describe('distribuição de humores dos últimos 30 dias (RF-28)', () => {
  it('conta só registros ativos com humor na janela que termina hoje', () => {
    const distribution = moodDistribution(
      [
        entry('2026-10-27', 'feliz'),
        entry('2026-10-28', 'feliz'),
        entry('2026-11-01', 'ansioso'),
        entry('2026-11-20', 'estressado'),
        entry('2026-11-22', 'feliz', true),
        entry('2026-11-25'),
        entry('2026-11-26', 'cansado'),
        entry('2026-11-27', 'feliz'),
      ],
      '2026-11-26',
    )

    expect(distribution).toEqual({
      feliz: 1,
      ansioso: 1,
      cansado: 1,
      estressado: 1,
      total: 4,
    })
  })

  it('devolve zeros quando não há humor registrado', () => {
    expect(moodDistribution([entry('2026-11-26')], '2026-11-26').total).toBe(0)
  })
})
