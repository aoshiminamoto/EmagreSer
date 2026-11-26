/** Chamadas de autenticação: a API devolve só códigos, traduzidos pelo cliente. */
import { apiJson, type TokenResponse } from '../../net/auth-client'
import { recordSignIn } from './session'

export interface RegisterInput {
  email: string
  password: string
  consent: boolean
  displayName?: string
}

export interface Credentials {
  email: string
  password: string
}

function jsonInit(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

const publicOptions = { auth: false } as const

export async function register(input: RegisterInput): Promise<void> {
  const name = input.displayName?.trim()
  const token = await apiJson<TokenResponse>(
    '/api/v1/auth/register',
    jsonInit({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      consent: input.consent,
      ...(name ? { displayName: name } : {}),
    }),
    publicOptions,
  )
  await recordSignIn(token)
}

export async function login(input: Credentials): Promise<void> {
  const token = await apiJson<TokenResponse>(
    '/api/v1/auth/login',
    jsonInit({ email: input.email.trim().toLowerCase(), password: input.password }),
    publicOptions,
  )
  await recordSignIn(token)
}

/** RF-49: resposta idêntica exista ou não o e-mail. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiJson<{ ok: boolean }>(
    '/api/v1/auth/forgot-password',
    jsonInit({ email: email.trim().toLowerCase() }),
    publicOptions,
  )
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiJson<{ ok: boolean }>(
    '/api/v1/auth/reset-password',
    jsonInit({ token, password }),
    publicOptions,
  )
}
