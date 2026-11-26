import { createHash, randomBytes } from 'node:crypto'

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** 256 bits de aleatoriedade, codificados para uso em cookie e URL. */
export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return sha256(token)
}
