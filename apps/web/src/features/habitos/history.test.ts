import { describe, expect, it } from 'vitest'
import type { HabitLog } from '../../data/entities'
import { daysBefore, lastCalendarDays } from './dates'
import { habitCompletionPercent, HISTORY_DAYS } from './history'

const today = '2026-03-01'

function log(date: string, habitId: string, done = true): HabitLog {
  return { id: `${date}-${habitId}`, date, habitId, done, updatedAt: date }
}

describe('datas civis da janela (RN-08)', () => {
  it('atravessa mês, ano e dia de ano bissexto sem usar o fuso local', () => {
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28')
    expect(daysBefore('2024-03-01', 1)).toBe('2024-02-29')
    expect(daysBefore('2026-01-01', 1)).toBe('2025-12-31')
    expect(lastCalendarDays(today, 3)).toEqual(['2026-02-27', '2026-02-28', today])
    expect(() => lastCalendarDays(today, 0)).toThrow(RangeError)
  })
})

describe('percentual de dias cumpridos (RF-26)', () => {
  it('conta só os dias em que todos os hábitos ativos foram marcados', () => {
    const logs = [
      log('2026-02-28', 'a'),
      log('2026-02-28', 'b'),
      log('2026-02-27', 'a'),
      log('2026-02-26', 'a'),
      log('2026-02-26', 'b', false),
    ]
    expect(habitCompletionPercent(logs, ['a', 'b'], today, 3)).toBe(33)
    expect(habitCompletionPercent(logs, ['a'], today, 3)).toBe(67)
  })

  it('sem hábitos ativos o percentual é zero e a janela padrão é 30 dias', () => {
    expect(HISTORY_DAYS).toBe(30)
    expect(habitCompletionPercent([log(today, 'a')], [], today)).toBe(0)
    expect(habitCompletionPercent([], ['a'], today)).toBe(0)
  })

  it('ignora tombstone e dias fora da janela', () => {
    const logs = [{ ...log(today, 'a'), deleted: true }, log('2026-01-31', 'a')]
    expect(habitCompletionPercent(logs, ['a'], today, 2)).toBe(0)
  })
})
