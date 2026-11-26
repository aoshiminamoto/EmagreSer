import { describe, expect, it } from 'vitest'
import { isValidEmail, isValidPassword, isValidTime, parseHeight, parseWeight } from './validation'

describe('validação das telas de conta', () => {
  it('aceita peso com vírgula ou ponto e uma casa decimal', () => {
    expect(parseWeight(' 68,5 ')).toBe(68.5)
    expect(parseWeight('68.54')).toBe(68.5)
    expect(parseWeight('abc')).toBeNull()
    expect(parseWeight('0')).toBeNull()
    expect(parseWeight('-1')).toBeNull()
  })

  it('aceita altura entre 100 e 250 cm', () => {
    expect(parseHeight('160')).toBe(160)
    expect(parseHeight('99')).toBeNull()
    expect(parseHeight('251')).toBeNull()
    expect(parseHeight('160,5')).toBeNull()
  })

  it('valida e-mail, senha e horário HH:mm', () => {
    expect(isValidEmail(' pessoa@exemplo.com ')).toBe(true)
    expect(isValidEmail('sem-arroba')).toBe(false)
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('curta')).toBe(false)
    expect(isValidTime('07:30')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('07:60')).toBe(false)
  })
})
