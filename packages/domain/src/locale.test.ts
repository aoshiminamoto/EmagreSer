import { describe, expect, it } from 'vitest'
import { resolveLocale } from './locale.js'

describe('resolução do idioma (RN-15)', () => {
  it('prefere o idioma salvo pelo usuário quando o flag está ligado', () => {
    expect(
      resolveLocale(
        { userLocale: 'es-419', preLoginLocale: 'en-US', browserLanguages: ['pt-BR'] },
        { 'es-419': true, 'en-US': true },
      ),
    ).toBe('es-419')
  })

  it('usa a escolha feita antes do login quando não há idioma salvo', () => {
    expect(resolveLocale({ preLoginLocale: 'en-US' }, { 'en-US': true })).toBe('en-US')
  })

  it('usa o prefixo do navegador na ordem das preferências', () => {
    expect(
      resolveLocale({ browserLanguages: ['fr-FR', 'en-GB', 'es-MX'] }, { 'en-US': true }),
    ).toBe('en-US')
    expect(resolveLocale({ browserLanguages: ['es-MX'] }, { 'es-419': true })).toBe('es-419')
  })

  it('cai para pt-BR quando nada está disponível', () => {
    expect(resolveLocale({}, {})).toBe('pt-BR')
    expect(resolveLocale({ browserLanguages: ['de-DE'] }, {})).toBe('pt-BR')
    expect(resolveLocale({ userLocale: 'xx-XX' }, {})).toBe('pt-BR')
  })

  it('mantém a preferência salva com flag desligado e a recupera ao religar', () => {
    const preferences = { userLocale: 'en-US', browserLanguages: ['pt-BR'] }
    expect(resolveLocale(preferences, { 'en-US': false })).toBe('pt-BR')
    expect(preferences.userLocale).toBe('en-US')
    expect(resolveLocale(preferences, { 'en-US': true })).toBe('en-US')
  })

  it('não bloqueia pt-BR por flag e ignora valores desconhecidos', () => {
    expect(resolveLocale({ userLocale: 'pt-BR' }, { 'pt-BR': false })).toBe('pt-BR')
    expect(resolveLocale({ userLocale: 'en-US', preLoginLocale: 'es-419' }, {})).toBe('pt-BR')
  })
})
