import { db } from './db'
import type { CalendarDate, ProgressPhoto } from './entities'

export interface ProgressPhotoInput {
  date: CalendarDate
  angle: string
  blob: Blob
}

/** Fotos ficam só no aparelho: sem outbox e sem tombstone. */
export async function putProgressPhoto(
  input: ProgressPhotoInput,
  now: Date = new Date(),
): Promise<ProgressPhoto> {
  const record: ProgressPhoto = {
    id: crypto.randomUUID(),
    date: input.date,
    angle: input.angle,
    blob: input.blob,
    createdAt: now.toISOString(),
  }
  await db.progressPhotos.put(record)
  return record
}

export async function getProgressPhoto(id: string): Promise<ProgressPhoto | undefined> {
  return db.progressPhotos.get(id)
}

export async function listProgressPhotos(): Promise<ProgressPhoto[]> {
  const photos = await db.progressPhotos.toArray()
  return photos.sort((a, b) => b.date.localeCompare(a.date))
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  await db.progressPhotos.delete(id)
}
