import { db } from './db'
import type { MetaKey } from './entities'

export function getMeta<T>(key: MetaKey): Promise<T | undefined> {
  return db.meta.get(key).then((record) => record?.value as T | undefined)
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

/** Um identificador por aparelho, criado uma única vez. */
export async function getDeviceId(): Promise<string> {
  return db.transaction('rw', db.meta, async () => {
    const existing = await db.meta.get('deviceId')
    if (typeof existing?.value === 'string') return existing.value
    const deviceId = crypto.randomUUID()
    await db.meta.put({ key: 'deviceId', value: deviceId })
    return deviceId
  })
}

export async function getLastPullCursor(): Promise<number> {
  return (await getMeta<number>('lastPullCursor')) ?? 0
}

export async function setLastPullCursor(cursor: number): Promise<void> {
  await setMeta('lastPullCursor', cursor)
}

export function getLocalePref(): Promise<string | undefined> {
  return getMeta<string>('localePref')
}

export async function setLocalePref(locale: string): Promise<void> {
  await setMeta('localePref', locale)
}

export async function getFlags(): Promise<Record<string, boolean>> {
  return (await getMeta<Record<string, boolean>>('flags')) ?? {}
}

export async function setFlags(flags: Record<string, boolean>): Promise<void> {
  await setMeta('flags', flags)
}
