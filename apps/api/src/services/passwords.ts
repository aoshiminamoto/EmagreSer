import { Algorithm, hash, verify } from '@node-rs/argon2'

// Parâmetros recomendados para argon2id (19 MiB, 2 passagens, 1 thread).
const options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, options)
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password, options)
}
