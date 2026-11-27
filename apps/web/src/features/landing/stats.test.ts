import { describe, expect, it } from 'vitest'
import { isBelowThreshold, isPublicStats } from './stats'

describe('/public/stats no cliente (RN-14)', () => {
  const valid = {
    activeUsers30d: 12,
    totalUsers: 80,
    weightEntries: 300,
    habitsCompleted: 150,
    waterGlasses: 900,
    updatedAt: '2026-11-27T10:00:00.000Z',
  }

  it('aceita somente totais válidos', () => {
    expect(isPublicStats(valid)).toBe(true)
    expect(isPublicStats({ ...valid, weightEntries: -1 })).toBe(false)
    expect(isPublicStats({ ...valid, updatedAt: 'ontem' })).toBe(false)
    expect(isPublicStats(null)).toBe(false)
  })

  it('reconhece o limiar mínimo sem números', () => {
    expect(isBelowThreshold({ belowThreshold: true })).toBe(true)
    expect(isBelowThreshold(valid)).toBe(false)
  })
})
