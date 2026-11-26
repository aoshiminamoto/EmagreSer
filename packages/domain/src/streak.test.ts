import { describe, expect, it } from 'vitest'
import { calculateStreak } from './streak.js'

describe('streak (RN-06 / RF-20 a RF-22)', () => {
  it('conta dias seguidos terminando hoje', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03']
    expect(calculateStreak(dates, '2026-01-03')).toEqual({ current: 3, best: 3 })
  })

  it('mantém o streak se hoje ainda não é ativo mas ontem foi', () => {
    const dates = ['2026-01-01', '2026-01-02']
    expect(calculateStreak(dates, '2026-01-03')).toEqual({ current: 2, best: 2 })
  })

  it('zera o streak ao passar um dia inteiro sem ação', () => {
    const dates = ['2026-01-01', '2026-01-02']
    expect(calculateStreak(dates, '2026-01-04')).toEqual({ current: 0, best: 2 })
  })

  it('recalcula o recorde após edição retroativa que remove um dia do meio', () => {
    const dates = ['2026-01-01', '2026-01-03', '2026-01-04']
    expect(calculateStreak(dates, '2026-01-04')).toEqual({ current: 2, best: 2 })
  })

  it('recalcula o atual quando uma edição retroativa volta a ligar os dias', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03']
    expect(calculateStreak(dates, '2026-01-04')).toEqual({ current: 3, best: 3 })
  })

  it('preserva um recorde anterior informado', () => {
    expect(calculateStreak(['2026-01-03'], '2026-01-03', 12)).toEqual({ current: 1, best: 12 })
  })

  it('lida com streak de zero dias, datas repetidas e datas futuras', () => {
    expect(calculateStreak([], '2026-01-03')).toEqual({ current: 0, best: 0 })
    expect(calculateStreak(['2026-01-01', '2026-01-01'], '2026-01-01')).toEqual({
      current: 1,
      best: 1,
    })
    expect(calculateStreak(['2026-01-01', '2026-01-10'], '2026-01-03')).toEqual({
      current: 0,
      best: 1,
    })
  })

  it('conta a união de ações na mesma data uma única vez', () => {
    const dates = ['2026-01-01', '2026-01-01', '2026-01-02']
    expect(calculateStreak(dates, '2026-01-02')).toEqual({ current: 2, best: 2 })
  })
})
