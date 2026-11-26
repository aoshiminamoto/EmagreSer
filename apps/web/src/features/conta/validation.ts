/** Validações locais das telas de conta e onboarding; regras puras, sem Vue. */

export const WEIGHT_STEP_OPTIONS = [1, 2, 3, 5] as const
export type WeightStep = (typeof WEIGHT_STEP_OPTIONS)[number]

/** Aceita vírgula ou ponto como separador e grava no máximo uma casa decimal. */
export function parseWeight(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0 || value >= 1000) return null
  return Math.round(value * 10) / 10
}

export function parseHeight(raw: string): number | null {
  const value = Number(raw.trim())
  if (!Number.isInteger(value)) return null
  return value >= 100 && value <= 250 ? value : null
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

export function isValidPassword(raw: string): boolean {
  return raw.length >= 8
}

/** Horário de calendário em HH:mm (a formatação para a tela fica em i18n/format.ts). */
export function isValidTime(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw)
}
