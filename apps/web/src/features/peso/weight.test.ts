import { describe, expect, it } from 'vitest'
import type { WeightEntry } from '../../data/entities'
import {
  adjustWeight,
  calendarDate,
  daysBetween,
  firstDayOfWeek,
  isWeightIncrease,
  isValidCalendarDate,
  isValidWeightKg,
  latestWeight,
  movingAverageBefore,
  parseDecimal,
  parseWeightKg,
} from './weight'

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, updatedAt: '2026-11-26T10:00:00.000Z' }
}

describe('parseDecimal (RN-16)', () => {
  it('aceita vírgula, ponto e agrupadores em qualquer idioma', () => {
    expect(parseDecimal('80,5')).toBe(80.5)
    expect(parseDecimal('80.5')).toBe(80.5)
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(parseDecimal(' 80 ')).toBe(80)
  })

  it('usa o último separador como decimal e recusa entrada inválida', () => {
    expect(parseDecimal('1,234.5')).toBe(1234.5)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('80,5kg')).toBeNull()
    expect(parseDecimal('1,2,3x')).toBeNull()
  })
})

describe('parseWeightKg', () => {
  it('normaliza para uma casa e valida 20 a 500 kg', () => {
    expect(parseWeightKg('70,25')).toBe(70.3)
    expect(parseWeightKg('20')).toBe(20)
    expect(parseWeightKg('500')).toBe(500)
    expect(parseWeightKg('19,9')).toBeNull()
    expect(parseWeightKg('500,1')).toBeNull()
    expect(parseWeightKg('nada')).toBeNull()
    expect(isValidWeightKg(Number.NaN)).toBe(false)
  })

  it('ajusta em 0,1 sem erro de ponto flutuante', () => {
    expect(adjustWeight(70.2, 0.1)).toBe(70.3)
    expect(adjustWeight(70.2, -0.1)).toBe(70.1)
  })
})

describe('datas civis (RN-08)', () => {
  it('valida dias existentes e converte instante local', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true)
    expect(isValidCalendarDate('2026-02-30')).toBe(false)
    expect(calendarDate(new Date(2026, 0, 15, 23, 59))).toBe('2026-01-15')
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
  })

  it('primeiro dia da semana segue o idioma no Vuetify (0 = domingo)', () => {
    expect(firstDayOfWeek('en-US')).toBe(0)
    expect(firstDayOfWeek('pt-BR')).toBe(1)
    expect(firstDayOfWeek('es-419')).toBe(1)
  })
})

describe('média móvel e subida (RN-01/RN-02/RN-05)', () => {
  it('peso de referência é o mais recente', () => {
    expect(latestWeight([entry('2026-01-01', 71), entry('2026-01-02', 70)])).toMatchObject({
      weightKg: 70,
    })
  })

  it('média ignora dias sem registro e intervalos fora da janela', () => {
    const entries = [entry('2026-01-01', 90), entry('2026-01-03', 80), entry('2025-12-20', 60)]
    expect(movingAverageBefore(entries, '2026-01-04')).toBe(85)
    expect(movingAverageBefore([], '2026-01-04')).toBeNull()
  })

  it('detecta subida contra o registro anterior', () => {
    expect(isWeightIncrease(entry('2026-01-02', 71), [entry('2026-01-01', 70)])).toBe(true)
    expect(isWeightIncrease(entry('2026-01-02', 69), [entry('2026-01-01', 70)])).toBe(false)
  })

  it('detecta subida contra a média sem o novo registro', () => {
    const before = [entry('2026-01-01', 100), entry('2026-01-02', 50), entry('2026-01-03', 100)]
    expect(isWeightIncrease(entry('2026-01-04', 90), before)).toBe(true)
  })
})
