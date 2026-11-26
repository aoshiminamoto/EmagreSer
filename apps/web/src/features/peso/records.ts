/** Escrita de peso com recálculo local e anúncio dos pontos de extensão. */
import {
  deleteWeightEntry,
  editWeightEntry,
  listWeightEntries,
  putWeightEntry,
  type WeightEntryInput,
} from '../../data/weights'
import type { WeightEntry } from '../../data/entities'
import { recalcAfterPull } from '../../sync/recalc'
import { emitPesoEvent, type WeightSavedContext } from './events'
import { isWeightIncrease, latestWeight } from './weight'

function announce(entry: WeightEntry, before: readonly WeightEntry[]): void {
  const previous = latestWeight(before.filter((item) => item.date < entry.date)) ?? undefined
  const context: WeightSavedContext = {
    entry,
    ...(previous === undefined ? {} : { previous }),
    isIncrease: isWeightIncrease(entry, before),
  }
  emitPesoEvent('weight:saved', context)
  emitPesoEvent('mood:prompt', { entry })
  if (context.isIncrease) emitPesoEvent('welcome:prompt', context)
  emitPesoEvent('milestone:evaluate', { entry })
}

export async function registerWeight(
  input: WeightEntryInput,
  now: Date = new Date(),
): Promise<WeightEntry> {
  const before = await listWeightEntries()
  const entry = await putWeightEntry(input, now)
  // RF-19: gráfico, marcos e streak também são recalculados após escrita local.
  await recalcAfterPull(now)
  announce(entry, before)
  return entry
}

export async function updateWeight(
  id: string,
  input: WeightEntryInput,
  now: Date = new Date(),
): Promise<WeightEntry> {
  const before = (await listWeightEntries()).filter((entry) => entry.id !== id)
  const entry = await editWeightEntry(id, input, now)
  await recalcAfterPull(now)
  announce(entry, before)
  return entry
}

export async function removeWeight(id: string, now: Date = new Date()): Promise<void> {
  await deleteWeightEntry(id, now)
  await recalcAfterPull(now)
}
