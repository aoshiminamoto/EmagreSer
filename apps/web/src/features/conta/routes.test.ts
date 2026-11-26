import { describe, expect, it } from 'vitest'
import { resolveInitialRoute } from './routes'

describe('rota inicial (RN-12)', () => {
  it('sem sessão abre o login', () => {
    expect(resolveInitialRoute(false, false)).toBe('login')
    expect(resolveInitialRoute(false, true)).toBe('login')
  })

  it('com sessão e sem onboarding abre as boas-vindas', () => {
    expect(resolveInitialRoute(true, false)).toBe('onboarding')
  })

  it('com sessão e onboarding feito abre o Hoje', () => {
    expect(resolveInitialRoute(true, true)).toBe('today')
  })
})
