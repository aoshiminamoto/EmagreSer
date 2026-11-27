/** RF-67/RN-14: valida os agregados públicos antes de exibir qualquer número. */
export interface PublicStats {
  activeUsers30d: number
  totalUsers: number
  weightEntries: number
  habitsCompleted: number
  waterGlasses: number
  updatedAt: string
}

export interface BelowThreshold {
  belowThreshold: true
}

export type PublicStatsResponse = PublicStats | BelowThreshold

export function isBelowThreshold(value: unknown): value is BelowThreshold {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { belowThreshold?: unknown }).belowThreshold === true
  )
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function isPublicStats(value: unknown): value is PublicStats {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    count(candidate.activeUsers30d) &&
    count(candidate.totalUsers) &&
    count(candidate.weightEntries) &&
    count(candidate.habitsCompleted) &&
    count(candidate.waterGlasses) &&
    typeof candidate.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.updatedAt))
  )
}
