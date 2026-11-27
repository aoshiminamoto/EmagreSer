/** RF-65: o QR Code aponta sempre para a raiz de APP_ORIGIN. */
export function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
  return raw.replace(/\/+$/, '')
}

export function landingOrigin(): string {
  return normalizeOrigin(import.meta.env.VITE_APP_ORIGIN, globalThis.location?.origin ?? '')
}
