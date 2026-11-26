import { db } from './db'
import type { CalendarDate, Milestone } from './entities'
import { writeWithOutbox } from './outbox'

export interface MilestoneInput {
  milestoneKg: number
  achievedDate?: CalendarDate
}

/** Um marco por quilo de meta, com o mesmo id enquanto o registro estiver ativo. */
export async function putMilestone(
  input: MilestoneInput,
  now: Date = new Date(),
): Promise<Milestone> {
  const existing = await db.milestones
    .where('milestoneKg')
    .equals(input.milestoneKg)
    .filter((milestone) => !milestone.deleted)
    .first()
  const record: Milestone = {
    id: existing?.id ?? crypto.randomUUID(),
    milestoneKg: input.milestoneKg,
    ...(input.achievedDate !== undefined ? { achievedDate: input.achievedDate } : {}),
    ...(existing?.celebrated !== undefined ? { celebrated: existing.celebrated } : {}),
    updatedAt: now.toISOString(),
  }
  return writeWithOutbox(db.milestones, record, 'milestones', 'upsert')
}

export async function listMilestones(): Promise<Milestone[]> {
  const milestones = await db.milestones.toArray()
  return milestones
    .filter((milestone) => !milestone.deleted)
    .sort((a, b) => a.milestoneKg - b.milestoneKg)
}

export async function deleteMilestone(id: string, now: Date = new Date()): Promise<void> {
  const current = await db.milestones.get(id)
  if (current === undefined || current.deleted) return
  const tombstone: Milestone = { ...current, deleted: true, updatedAt: now.toISOString() }
  await writeWithOutbox(db.milestones, tombstone, 'milestones', 'delete')
}

/** `celebrated` existe só no aparelho: nunca gera item na fila de saída. */
export async function setCelebrated(id: string, celebrated: boolean): Promise<void> {
  await db.milestones.update(id, { celebrated })
}
