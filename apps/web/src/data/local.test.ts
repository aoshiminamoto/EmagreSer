import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  getDeviceId,
  getFlags,
  getLastPullCursor,
  getLocalePref,
  setFlags,
  setLastPullCursor,
  setLocalePref,
} from './meta'
import { countOutbox } from './outbox'
import { deleteProgressPhoto, listProgressPhotos, putProgressPhoto } from './photos'
import { DEFAULT_SETTINGS, ensureSettings, getSettings, saveSettings } from './settings'

const now = new Date('2026-11-26T10:00:00.000Z')

describe('dados apenas locais', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('configurações têm padrões da especificação e uma única linha', async () => {
    const created = await ensureSettings(now)
    expect(created).toMatchObject(DEFAULT_SETTINGS)
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i)

    const edited = await saveSettings({ waterGoalGlasses: 10, locale: 'en-US' }, now)
    expect(edited.id).toBe(created.id)
    expect(edited).toMatchObject({ waterGoalGlasses: 10, locale: 'en-US' })
    expect(await db.settings.count()).toBe(1)
    expect(await getSettings()).toMatchObject({ reminderTime: '07:30' })
    expect(await countOutbox()).toBe(2)
  })

  it('fotos ficam no aparelho: sem outbox e com exclusão permanente', async () => {
    const blob = new Blob(['foto'], { type: 'image/jpeg' })
    const photo = await putProgressPhoto({ date: '2026-11-26', angle: 'front', blob }, now)

    expect(await listProgressPhotos()).toHaveLength(1)
    expect(await db.progressPhotos.get(photo.id)).toMatchObject({ angle: 'front' })
    expect(await countOutbox()).toBe(0)

    await deleteProgressPhoto(photo.id)
    expect(await listProgressPhotos()).toEqual([])
  })

  it('meta guarda deviceId, cursor, idioma e flags sem tocar a fila', async () => {
    const deviceId = await getDeviceId()
    expect(await getDeviceId()).toBe(deviceId)
    expect(await getLastPullCursor()).toBe(0)
    await setLastPullCursor(42)
    await setLocalePref('es-419')
    await setFlags({ flags: { i18n_en: true }, locales: ['pt-BR', 'en-US'] })

    expect(await getLastPullCursor()).toBe(42)
    expect(await getLocalePref()).toBe('es-419')
    expect(await getFlags()).toEqual({ flags: { i18n_en: true }, locales: ['pt-BR', 'en-US'] })
    expect(await countOutbox()).toBe(0)
  })
})
