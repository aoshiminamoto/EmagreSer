import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../bootstrap', () => ({ onLogin: vi.fn(async () => undefined) }))
vi.mock('../../flags/client', () => ({
  applyLocaleFromFlags: vi.fn(async () => 'pt-BR'),
  offlineFlags: () => ({ flags: { i18n_en: false, i18n_es: false }, locales: ['pt-BR'] }),
}))

import { db } from '../../data/db'
import { getMeta } from '../../data/meta'
import { ApiError, clearSession, resetAuthClientForTests } from '../../net/auth-client'
import { login, register, requestPasswordReset, resetPassword } from './auth'
import { authErrorMessage } from './errors'
import { resetSessionForTests } from './session'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function lastBody(): Record<string, unknown> {
  const call = vi.mocked(fetch).mock.calls.at(-1)
  const init = call?.[1] as RequestInit | undefined
  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
}

const token = { accessToken: 'token-de-teste', tokenType: 'Bearer', expiresIn: 3600 }

beforeEach(async () => {
  await db.delete()
  await db.open()
  clearSession()
  resetAuthClientForTests()
  resetSessionForTests()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response(token)),
  )
})

describe('autenticação pelo cliente', () => {
  it('cadastro envia consentimento e guarda a sessão', async () => {
    await register({ email: ' Pessoa@Exemplo.com ', password: 'senha-forte-123', consent: true })
    expect(lastBody()).toMatchObject({
      email: 'pessoa@exemplo.com',
      password: 'senha-forte-123',
      consent: true,
    })
    expect(await getMeta('sessionActive')).toBe(true)
  })

  it('mantém o código estável da API quando o cadastro falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ error: 'CONSENT_REQUIRED' }, 400)),
    )
    await expect(
      register({ email: 'pessoa@exemplo.com', password: 'senha-forte-123', consent: false }),
    ).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' })
    expect(await getMeta('sessionActive')).toBeUndefined()
  })

  it('login mostra mensagem genérica sem revelar se o e-mail existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ error: 'INVALID_CREDENTIALS' }, 401)),
    )
    const failure = await login({ email: 'pessoa@exemplo.com', password: 'errada' }).catch(
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(ApiError)
    expect(authErrorMessage((failure as ApiError).code)).toBe('E-mail ou senha incorretos.')
  })

  it('recuperação resolve com a mesma resposta para qualquer e-mail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: true }, 202)),
    )
    await expect(requestPasswordReset('Pessoa@Exemplo.com')).resolves.toBeUndefined()
    expect(lastBody()).toEqual({ email: 'pessoa@exemplo.com' })
  })

  it('redefinição envia token de uso único e nova senha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ ok: true })),
    )
    await resetPassword('token-unico', 'senha-nova-123')
    expect(lastBody()).toEqual({ token: 'token-unico', password: 'senha-nova-123' })
  })
})
