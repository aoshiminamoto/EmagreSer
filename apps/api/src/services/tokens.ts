import { SignJWT } from 'jose'
import { config } from '../config.js'
import { hashToken, newOpaqueToken } from './crypto.js'

const secretKey = new TextEncoder().encode(config.jwtSecret)

export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('emagreser')
    .setIssuedAt()
    .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
    .sign(secretKey)
}

export function newResetToken(): { token: string; hash: string } {
  const token = newOpaqueToken()
  return { token, hash: hashToken(token) }
}
