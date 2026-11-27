import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { dismissedRecently, INSTALL_COOLDOWN_MS } from './install'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000

describe('convite de instalação (RN-12)', () => {
  it('respeita o intervalo de 14 dias após dispensar', () => {
    expect(dismissedRecently(NOW - 13 * DAY, NOW)).toBe(true)
    expect(dismissedRecently(NOW - DAY, NOW)).toBe(true)
    expect(dismissedRecently(NOW - 14 * DAY, NOW)).toBe(false)
    expect(dismissedRecently(NOW - 15 * DAY, NOW)).toBe(false)
    expect(INSTALL_COOLDOWN_MS).toBe(14 * DAY)
  })

  it('mostra o convite quando nunca foi dispensado', () => {
    expect(dismissedRecently(undefined, NOW)).toBe(false)
  })
})
