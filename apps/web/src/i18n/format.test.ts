import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatRelative, formatTime } from './format'

const now = new Date(2026, 11, 31, 12, 0, 0)

describe('formatDate', () => {
  it('pt-BR usa dia/mês/ano', () => {
    expect(formatDate('2026-12-31', 'pt-BR')).toBe('31/12/2026')
  })

  it('en-US usa mês/dia/ano', () => {
    expect(formatDate('2026-12-31', 'en-US')).toBe('12/31/2026')
  })

  it('es-419 usa dia/mês/ano', () => {
    expect(formatDate('2026-12-31', 'es-419')).toBe('31/12/2026')
  })

  it('estilo mês/ano funciona nos três idiomas', () => {
    expect(formatDate('2026-12-31', 'pt-BR', 'monthYear')).toBe('dezembro de 2026')
    expect(formatDate('2026-12-31', 'en-US', 'monthYear')).toBe('December 2026')
    expect(formatDate('2026-12-31', 'es-419', 'monthYear')).toBe('diciembre de 2026')
  })
})

describe('formatTime', () => {
  it('pt-BR e es-419 usam 24 horas; en-US usa AM/PM', () => {
    expect(formatTime('08:45', 'pt-BR')).toBe('08:45')
    expect(formatTime('08:45', 'es-419')).toBe('08:45 a.m.')
    expect(formatTime('08:45', 'en-US')).toBe('08:45 AM')
  })
})

describe('formatRelative', () => {
  it('hoje, ontem e amanhã nos três idiomas', () => {
    expect(formatRelative('2026-12-31', 'pt-BR', now)).toBe('hoje')
    expect(formatRelative('2026-12-30', 'pt-BR', now)).toBe('ontem')
    expect(formatRelative('2026-12-30', 'en-US', now)).toBe('yesterday')
    expect(formatRelative('2026-12-30', 'es-419', now)).toBe('ayer')
    expect(formatRelative('2027-01-01', 'en-US', now)).toBe('tomorrow')
  })
})

describe('formatNumber', () => {
  it('peso com uma casa e unidade kg nos três idiomas', () => {
    expect(formatNumber(68.5, 'pt-BR', 'weight')).toBe('68,5 kg')
    expect(formatNumber(68.5, 'en-US', 'weight')).toBe('68.5 kg')
    expect(formatNumber(68.5, 'es-419', 'weight')).toBe('68.5 kg')
  })

  it('IMC com exatamente uma casa decimal nos três idiomas', () => {
    expect(formatNumber(24, 'pt-BR', 'bmi')).toBe('24,0')
    expect(formatNumber(24.56, 'en-US', 'bmi')).toBe('24.6')
    expect(formatNumber(24.56, 'es-419', 'bmi')).toBe('24.6')
  })

  it('percentual e contador nos três idiomas', () => {
    expect(formatNumber(0.78, 'pt-BR', 'percent')).toBe('78%')
    expect(formatNumber(0.78, 'en-US', 'percent')).toBe('78%')
    expect(formatNumber(0.78, 'es-419', 'percent')).toBe('78%')
    expect(formatNumber(1234, 'pt-BR', 'count')).toBe('1.234')
    expect(formatNumber(1234, 'en-US', 'count')).toBe('1,234')
    expect(formatNumber(1234, 'es-419', 'count')).toBe('1,234')
  })
})
