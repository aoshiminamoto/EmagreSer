import { describe, expect, it } from 'vitest'
import {
  generateMilestones,
  isMilestoneAchieved,
  progressFromEntries,
  progressPercent,
} from './goals.js'
import type { WeightEntry } from './types.js'

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, updatedAt: date }
}

describe('geração de marcos (RN-03)', () => {
  it('gera P−S, P−2S... e termina sempre no peso-alvo', () => {
    expect(generateMilestones(90, 80, 4)).toEqual([86, 82, 80])
    expect(generateMilestones(90, 80, 2)).toEqual([88, 86, 84, 82, 80])
    expect(generateMilestones(84, 80, 4)).toEqual([80])
  })

  it('não gera marcos quando a meta já foi atingida', () => {
    expect(generateMilestones(80, 80, 2)).toEqual([])
    expect(generateMilestones(79, 80, 2)).toEqual([])
  })

  it('rejeita passo inválido', () => {
    expect(() => generateMilestones(90, 80, 0)).toThrow(RangeError)
    expect(() => generateMilestones(90, 80, -2)).toThrow(RangeError)
  })

  it('considera alcançado qualquer peso menor ou igual ao marco', () => {
    const entries = [entry('2026-01-01', 86), { ...entry('2026-01-02', 1), deleted: true }]
    expect(isMilestoneAchieved(86, entries)).toBe(true)
    expect(isMilestoneAchieved(82, entries)).toBe(false)
  })
})

describe('progresso (RN-04)', () => {
  it('vai de 0% no peso inicial a 100% no peso-alvo', () => {
    expect(progressPercent(90, 90, 80)).toBe(0)
    expect(progressPercent(90, 85, 80)).toBe(50)
    expect(progressPercent(90, 80, 80)).toBe(100)
  })

  it('limita o resultado entre 0% e 100%', () => {
    expect(progressPercent(90, 95, 80)).toBe(0)
    expect(progressPercent(90, 70, 80)).toBe(100)
    expect(progressPercent(80, 75, 80)).toBe(100)
  })

  it('usa o peso mais recente ao calcular a partir dos registros', () => {
    const entries = [entry('2026-01-01', 90), entry('2026-01-02', 85)]
    expect(progressFromEntries(90, 80, entries)).toBe(50)
    expect(progressFromEntries(90, 80, [])).toBe(0)
  })
})
