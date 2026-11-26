import { describe, expect, it } from 'vitest'
import { addDays, calendarDateFromInstant, daysBetween, isValidCalendarDate } from './dates.js'

describe('helpers de data de calendário', () => {
  it('valida datas existentes e rejeita datas impossíveis', () => {
    expect(isValidCalendarDate('2024-02-29')).toBe(true)
    expect(isValidCalendarDate('2025-02-29')).toBe(false)
    expect(isValidCalendarDate('2026-13-01')).toBe(false)
    expect(isValidCalendarDate('2026-01-32')).toBe(false)
    expect(isValidCalendarDate('01/02/2026')).toBe(false)
  })

  it('soma e subtrai dias civis atravessando mês e ano', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })

  it('conta a diferença em dias civis com sinal', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('converte um instante para a data civil do aparelho', () => {
    expect(calendarDateFromInstant(new Date(2026, 0, 15, 23, 59))).toBe('2026-01-15')
  })
})
