import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { clearKey, countAndAllow, getCount } from '../plugins/rate-limit.js'
import { sha256 } from './crypto.js'

export interface LoginKeys {
  emailKey: string
  ipKey: string
}

export function loginKeys(email: string, ip: string): LoginKeys {
  return {
    emailKey: `rl:login:email:${sha256(email.toLowerCase())}`,
    ipKey: `rl:login:ip:${sha256(ip)}`,
  }
}

export async function isLoginBlocked(app: FastifyInstance, keys: LoginKeys): Promise<boolean> {
  const [emailCount, ipCount] = await Promise.all([
    getCount(app, keys.emailKey),
    getCount(app, keys.ipKey),
  ])
  return emailCount >= config.loginAttemptLimit || ipCount >= config.loginAttemptLimit
}

export async function registerLoginFailure(app: FastifyInstance, keys: LoginKeys): Promise<void> {
  await Promise.all([
    countAndAllow(app, keys.emailKey, config.loginAttemptLimit, config.loginWindowSeconds),
    countAndAllow(app, keys.ipKey, config.loginAttemptLimit, config.loginWindowSeconds),
  ])
}

export async function clearLoginFailures(app: FastifyInstance, keys: LoginKeys): Promise<void> {
  await Promise.all([clearKey(app, keys.emailKey), clearKey(app, keys.ipKey)])
}
