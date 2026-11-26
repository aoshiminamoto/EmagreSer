/**
 * Cliente HTTP da API. O token de acesso vive só em memória: recarregar a página
 * exige renovação pelo cookie de refresh (httpOnly). Dados locais nunca são
 * apagados por falha de autenticação — a fila de saída permanece intacta.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor() {
    super('NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED')
    this.name = 'AuthRequiredError'
  }
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

interface Session {
  value: string
  /** Renova com 30 s de antecedência para não expirar no meio de uma requisição. */
  expiresAt: number
}

let session: Session | null = null
let refreshInFlight: Promise<boolean> | null = null
let refreshUnauthorized = false
const authRequiredListeners = new Set<() => void>()

export function setSession(response: TokenResponse): void {
  session = {
    value: response.accessToken,
    expiresAt: Date.now() + Math.max(1, response.expiresIn - 30) * 1000,
  }
}

export function clearSession(): void {
  session = null
}

export function isAuthenticated(): boolean {
  return session !== null
}

/** Distingue refresh inválido (401) de falha de rede ao decidir a rota inicial. */
export function isRefreshUnauthorized(): boolean {
  return refreshUnauthorized
}

/** Isola os testes do estado em memória da sessão e dos listeners. */
export function resetAuthClientForTests(): void {
  session = null
  refreshInFlight = null
  refreshUnauthorized = false
  authRequiredListeners.clear()
}

/** Avisa a interface que é preciso entrar de novo; não apaga nada do aparelho. */
export function onAuthRequired(listener: () => void): () => void {
  authRequiredListeners.add(listener)
  return () => authRequiredListeners.delete(listener)
}

function notifyAuthRequired(): void {
  for (const listener of authRequiredListeners) listener()
}

async function errorFrom(response: Response): Promise<ApiError> {
  let code = 'REQUEST_FAILED'
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === 'string') code = body.error
  } catch {
    // Resposta sem corpo JSON vira código genérico; nunca texto do servidor.
  }
  return new ApiError(response.status, code)
}

/** Renovação única: várias requisições em paralelo compartilham o mesmo refresh. */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight !== null) return refreshInFlight
  const hadSession = session !== null
  refreshUnauthorized = false
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw await errorFrom(response)
      setSession((await response.json()) as TokenResponse)
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession()
        refreshUnauthorized = true
        if (hadSession) notifyAuthRequired()
      }
      // Falha de rede não apaga o token: a próxima tentativa renova de novo.
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function ensureToken(): Promise<void> {
  if (session !== null && session.expiresAt > Date.now()) return
  await refreshSession()
}

async function send(path: string, init: RequestInit, includeToken: boolean): Promise<Response> {
  const headers = new Headers(init.headers)
  if (includeToken && session !== null) headers.set('Authorization', `Bearer ${session.value}`)
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new NetworkError()
  }
}

export interface RequestOptions {
  /** Flags e rotas públicas não precisam de token nem de renovação. */
  auth?: boolean
  /** Anexa um token já existente sem disparar refresh (login opcional). */
  attachToken?: boolean
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<Response> {
  const withAuth = options.auth !== false
  if (withAuth) await ensureToken()
  let response = await send(path, init, withAuth || options.attachToken === true)
  if (response.status === 401 && withAuth) {
    if (!(await refreshSession())) throw new AuthRequiredError()
    response = await send(path, init, withAuth)
  }
  return response
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const response = await apiFetch(path, init, options)
  if (!response.ok) throw await errorFrom(response)
  return (await response.json()) as T
}
