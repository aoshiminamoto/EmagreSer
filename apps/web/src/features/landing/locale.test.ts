import { describe, expect, it } from 'vitest'
import { resolveLandingLocale } from './locale'

describe('idioma da landing (RF-81)', () => {
  it('respeita a preferência salva quando o idioma está liberado', () => {
    expect(resolveLandingLocale('es-419', ['pt-BR'], ['es-419'])).toBe('es-419')
  })

  it('ignora a preferência salva quando o flag está desligado', () => {
    expect(resolveLandingLocale('en-US', ['en-US'], [])).toBe('pt-BR')
  })

  it('usa o navegador e por fim pt-BR', () => {
    expect(resolveLandingLocale(undefined, ['en-GB', 'pt-BR'], ['en-US'])).toBe('en-US')
    expect(resolveLandingLocale(undefined, ['fr-FR'], ['en-US'])).toBe('pt-BR')
  })
})
