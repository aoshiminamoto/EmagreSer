/** Chaves do cache de flags no Redis; módulo sem dependência de config ou banco. */
export const flagsCachePrefix = 'flags:v1:'
export const flagsCachePattern = `${flagsCachePrefix}*`

export function flagsCacheKey(userId: string | null): string {
  return userId === null ? `${flagsCachePrefix}anon` : `${flagsCachePrefix}user:${userId}`
}
