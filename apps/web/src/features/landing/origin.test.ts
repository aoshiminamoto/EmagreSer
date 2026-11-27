import { describe, expect, it } from 'vitest'
import { normalizeOrigin } from './origin'

describe('origem pública da landing (RF-65)', () => {
  it('usa a raiz configurada e remove barras finais', () => {
    expect(normalizeOrigin('https://app.example.com/', 'https://outro.example')).toBe(
      'https://app.example.com',
    )
  })

  it('cai para a origem atual quando não há configuração', () => {
    expect(normalizeOrigin(undefined, 'https://app.example.com')).toBe('https://app.example.com')
    expect(normalizeOrigin('   ', 'https://app.example.com')).toBe('https://app.example.com')
  })
})
