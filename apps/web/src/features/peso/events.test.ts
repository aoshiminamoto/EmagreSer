import { describe, expect, it, vi } from 'vitest'
import type { WeightEntry } from '../../data/entities'
import { emitPesoEvent, onPesoEvent } from './events'

const entry: WeightEntry = {
  id: 'id',
  date: '2026-11-26',
  weightKg: 70,
  updatedAt: '2026-11-26T10:00:00.000Z',
}

describe('pontos de extensão do registro', () => {
  it('entrega o payload aos inscritos e permite cancelar', () => {
    const handler = vi.fn()
    const off = onPesoEvent('mood:prompt', handler)
    emitPesoEvent('mood:prompt', { entry })
    off()
    emitPesoEvent('mood:prompt', { entry })

    expect(handler).toHaveBeenCalledExactlyOnceWith({ entry })
  })

  it('canais diferentes não se misturam', () => {
    const welcome = vi.fn()
    const off = onPesoEvent('welcome:prompt', welcome)
    emitPesoEvent('milestone:evaluate', { entry })

    expect(welcome).not.toHaveBeenCalled()
    off()
  })
})
