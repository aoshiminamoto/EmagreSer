import { db } from './db'

/** RF-50: apaga todos os dados locais da conta, incluindo fotos e fila de saída. */
export async function clearLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.weightEntries,
      db.milestones,
      db.habits,
      db.habitLogs,
      db.waterLogs,
      db.outbox,
      db.meta,
      db.progressPhotos,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.weightEntries.clear(),
        db.milestones.clear(),
        db.habits.clear(),
        db.habitLogs.clear(),
        db.waterLogs.clear(),
        db.outbox.clear(),
        db.meta.clear(),
        db.progressPhotos.clear(),
      ])
    },
  )
}
