import { describe, expect, it } from 'vitest'
import { movingAverages } from '../../../../../packages/domain/src/weight.js'
import type { WeightEntry } from '../../data/entities'
import { buildTrend, isTrendEmpty, periodStart, trendIndicators } from './trend'

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, updatedAt: '2026-11-26T10:00:00.000Z' }
}

const entries = [
  entry('2026-01-01', 90),
  entry('2026-01-03', 88),
  entry('2026-01-08', 86),
  entry('2026-01-20', 84),
]

describe('períodos do gráfico (RF-09)', () => {
  it('começa 30 dias atrás, incluindo hoje, e 6 meses em 180 dias', () => {
    expect(periodStart('30d', entries, '2026-01-30')).toBe('2026-01-01')
    expect(periodStart('90d', entries, '2026-01-30')).toBe('2025-11-02')
    expect(periodStart('6m', entries, '2026-01-30')).toBe('2025-08-04')
    expect(periodStart('all', entries, '2026-01-30')).toBe('2026-01-01')
  })

  it('filtra fora do período e ignora tombstones', () => {
    const withDeleted = [...entries, { ...entry('2026-01-21', 70), deleted: true }]
    const points = buildTrend(withDeleted, '30d', '2026-01-20')
    expect(points.map((point) => point.date)).toEqual([
      '2026-01-01',
      '2026-01-03',
      '2026-01-08',
      '2026-01-20',
    ])
    expect(buildTrend(entries, '30d', '2026-01-10').map((point) => point.date)).toEqual([
      '2026-01-01',
      '2026-01-03',
      '2026-01-08',
    ])
  })
})

describe('média móvel do gráfico (RN-01)', () => {
  it('usa exatamente a mesma série do pacote de domínio', () => {
    const points = buildTrend(entries, 'all', '2026-01-30')
    const expected = movingAverages(entries)
    expect(points.map(({ date, average }) => ({ date, average }))).toEqual(expected)
  })

  it('ignora dias sem registro e não preenche a janela', () => {
    const points = buildTrend(
      [entry('2026-01-01', 90), entry('2026-01-03', 80)],
      'all',
      '2026-01-30',
    )
    expect(points.map((point) => point.average)).toEqual([90, 85])
  })
})

describe('indicadores e estado vazio (RF-11/RF-12)', () => {
  it('mostra vazio com menos de dois registros', () => {
    expect(isTrendEmpty(buildTrend(entries.slice(0, 1), 'all', '2026-01-30'))).toBe(true)
    expect(isTrendEmpty(buildTrend(entries, 'all', '2026-01-30'))).toBe(false)
  })

  it('calcula atual, média, total e variação da última semana', () => {
    expect(trendIndicators(entries, '2026-01-20')).toEqual({
      currentKg: 84,
      averageKg: 84,
      totalChangeKg: -6,
      weekChangeKg: -2,
    })
  })

  it('sem registros não inventa indicadores', () => {
    expect(trendIndicators([], '2026-01-20')).toEqual({
      currentKg: null,
      averageKg: null,
      totalChangeKg: null,
      weekChangeKg: null,
    })
  })
})
