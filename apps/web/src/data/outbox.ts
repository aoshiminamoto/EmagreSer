import type { Table } from 'dexie'
import { notifyLocalWrite } from '../sync/scheduler'
import { db } from './db'
import type { OutboxChange, SyncEntity, SyncOp, UpdatedAt } from './entities'

interface WriteRecord {
  id: string
  updatedAt: UpdatedAt
}

/**
 * Grava a entidade e o item da fila na mesma transação: se uma das duas
 * operações falhar, nenhuma das duas é aplicada.
 */
export async function writeWithOutbox<T extends WriteRecord>(
  table: Table<T, string>,
  record: T,
  entity: SyncEntity,
  op: SyncOp,
): Promise<T> {
  await db.transaction('rw', table, db.outbox, async () => {
    await table.put(record)
    await db.outbox.add({
      entity,
      id: record.id,
      op,
      data: op === 'upsert' ? ({ ...record } as unknown as Record<string, unknown>) : {},
      clientUpdatedAt: record.updatedAt,
    })
  })
  notifyLocalWrite()
  return record
}

export function listOutbox(limit?: number): Promise<OutboxChange[]> {
  const collection = db.outbox.orderBy('seq')
  return (limit === undefined ? collection : collection.limit(limit)).toArray()
}

export function countOutbox(): Promise<number> {
  return db.outbox.count()
}

export function deleteOutboxItems(seqs: number[]): Promise<void> {
  return db.outbox.bulkDelete(seqs).then(() => undefined)
}

export function clearOutbox(): Promise<void> {
  return db.outbox.clear()
}
