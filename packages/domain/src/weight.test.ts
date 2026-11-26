import { describe, expect, it } from 'vitest'
import type { WeightEntry } from './types.js'
import { isWeightIncrease, latestWeight, movingAverageAt, movingAverages } from './weight.js'

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, updatedAt: date }
}

describe('média móvel de 7 dias (RN-01)', () => {
  const entries = [entry('2026-01-01', 80), entry('2026-01-03', 82), entry('2026-01-07', 78)]

  it('usa só os 7 dias terminados na data, ignorando dias sem registro', () => {
    expect(movingAverageAt(entries, '2026-01-07')).toBe(80)
    expect(movingAverageAt(entries, '2026-01-08')).toBe(80)
  })

  it('existe com um único registro e é null sem registros na janela', () => {
    expect(movingAverageAt([entry('2026-01-05', 75)], '2026-01-05')).toBe(75)
    expect(movingAverageAt(entries, '2026-01-20')).toBeNull()
  })

  it('gera uma média por data com registro, em ordem cronológica', () => {
    expect(movingAverages(entries)).toEqual([
      { date: '2026-01-01', average: 80 },
      { date: '2026-01-03', average: 81 },
      { date: '2026-01-07', average: 80 },
    ])
  })

  it('ignora tombstones', () => {
    const deleted = { ...entry('2026-01-03', 82), deleted: true }
    const withDeleted = [entry('2026-01-01', 80), deleted, entry('2026-01-07', 78)]
    expect(movingAverageAt(withDeleted, '2026-01-07')).toBe(79)
  })
})

describe('peso de referência (RN-02)', () => {
  it('pega o registro mais recente, não o maior peso', () => {
    expect(latestWeight([entry('2026-01-02', 90), entry('2026-01-01', 80)])?.weightKg).toBe(90)
    expect(latestWeight([entry('2026-01-01', 90), entry('2026-01-02', 80)])?.weightKg).toBe(80)
  })

  it('retorna null sem registros ativos', () => {
    expect(latestWeight([])).toBeNull()
    expect(latestWeight([{ ...entry('2026-01-01', 80), deleted: true }])).toBeNull()
  })
})

describe('detecção de subida (RN-05)', () => {
  it('detecta subida contra o registro anterior', () => {
    const before = [entry('2026-01-01', 70)]
    expect(isWeightIncrease(entry('2026-01-20', 71), before)).toBe(true)
  })

  it('detecta subida contra a média móvel sem o novo registro', () => {
    const before = [entry('2026-01-01', 50), entry('2026-01-02', 80)]
    // Média 65: o novo peso não passa o anterior (80), mas passa a média.
    expect(isWeightIncrease(entry('2026-01-03', 75), before)).toBe(true)
  })

  it('não acusa subida em peso igual ou menor', () => {
    const before = [entry('2026-01-01', 80), entry('2026-01-02', 80)]
    expect(isWeightIncrease(entry('2026-01-03', 80), before)).toBe(false)
    expect(isWeightIncrease(entry('2026-01-03', 79), before)).toBe(false)
    expect(isWeightIncrease(entry('2026-01-20', 79), [])).toBe(false)
  })

  it('não compara com registros posteriores em edição retroativa', () => {
    const before = [entry('2026-01-10', 90)]
    expect(isWeightIncrease(entry('2026-01-01', 95), before)).toBe(false)
  })
})
