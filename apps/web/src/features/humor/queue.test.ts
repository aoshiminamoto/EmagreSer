import { describe, expect, it } from 'vitest'
import type { WeightEntry } from '../../data/entities'
import { emitPesoEvent, type WeightSavedContext } from '../peso/events'
import {
  buildPostSaveSteps,
  dismissPostSaveStep,
  queuedSteps,
  startPostSaveListener,
} from './queue'

const entry: WeightEntry = {
  id: 'e1',
  date: '2026-11-26',
  weightKg: 71,
  updatedAt: '2026-11-26T10:00:00.000Z',
}

function context(isIncrease: boolean): WeightSavedContext {
  return { entry, isIncrease }
}

/** Deixa a microtarefa de `schedule` e a espera pela celebração terminarem. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('fila pós-salvamento (RF-27/RF-29/RN-05)', () => {
  it('coloca o acolhimento antes do humor quando há subida', async () => {
    const stop = startPostSaveListener()
    try {
      emitPesoEvent('weight:saved', context(true))
      emitPesoEvent('mood:prompt', { entry })
      emitPesoEvent('welcome:prompt', context(true))
      await settle()

      expect(queuedSteps.value.map((step) => step.kind)).toEqual(['welcome', 'mood'])
      dismissPostSaveStep()
      expect(queuedSteps.value.map((step) => step.kind)).toEqual(['mood'])
      dismissPostSaveStep()
      expect(queuedSteps.value).toEqual([])
    } finally {
      stop()
    }
  })

  it('sem subida só pede o humor, uma vez por registro', async () => {
    const stop = startPostSaveListener()
    try {
      emitPesoEvent('weight:saved', context(false))
      emitPesoEvent('mood:prompt', { entry })
      await settle()

      expect(buildPostSaveSteps(context(false), entry).map((step) => step.kind)).toEqual(['mood'])
      expect(queuedSteps.value.map((step) => step.kind)).toEqual(['mood'])
      await settle()
      expect(queuedSteps.value).toHaveLength(1)
    } finally {
      stop()
    }
  })
})
