/** Erros da API carregam só códigos estáveis; nunca texto traduzido ou dado do usuário. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code)
    this.name = 'HttpError'
  }
}

export function httpError(statusCode: number, code: string): HttpError {
  return new HttpError(statusCode, code)
}
