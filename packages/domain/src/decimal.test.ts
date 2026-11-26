import { describe, expect, it } from 'vitest'
import { normalizeDecimal, parseDecimal } from './decimal.js'

describe('parseDecimal (RN-16)', () => {
  it('aceita vírgula e ponto como separador decimal', () => {
    expect(parseDecimal('80,5')).toBe(80.5)
    expect(parseDecimal('80.5')).toBe(80.5)
    expect(parseDecimal('80')).toBe(80)
  })

  it('trata o último símbolo como decimal quando há os dois', () => {
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(parseDecimal('1,234.5')).toBe(1234.5)
  })

  it('aceita sinal e espaços, e rejeita entradas inválidas', () => {
    expect(parseDecimal(' -0,5 ')).toBe(-0.5)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('80,5kg')).toBeNull()
    expect(parseDecimal('1,2,3x')).toBeNull()
  })

  it('normaliza para uma string com ponto decimal', () => {
    expect(normalizeDecimal('80,5')).toBe('80.5')
    expect(normalizeDecimal('1.234,50')).toBe('1234.5')
    expect(normalizeDecimal('nada')).toBeNull()
  })
})
