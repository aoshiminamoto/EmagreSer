import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/db'
import { countOutbox } from '../../data/outbox'
import { listProgressPhotos, putProgressPhoto } from '../../data/photos'
import { formatDate } from '../../i18n/format'
import {
  fitPhotoSize,
  PHOTO_MAX_SIDE,
  PHOTO_MIME_TYPE,
  PHOTO_QUALITY,
  resizePhoto,
  type DecodedPhoto,
  type PhotoResizeEnv,
} from './photo'

describe('redução de foto no cliente', () => {
  it('reduz foto de 12 MP mantendo a proporção e o maior lado em 1280 px', () => {
    expect(fitPhotoSize({ width: 4000, height: 3000 })).toEqual({ width: 1280, height: 960 })
    expect(fitPhotoSize({ width: 3000, height: 4000 })).toEqual({ width: 960, height: 1280 })
    expect(fitPhotoSize({ width: 640, height: 480 })).toEqual({ width: 640, height: 480 })
    expect(fitPhotoSize({ width: 12_000, height: 12_000 })).toEqual({
      width: PHOTO_MAX_SIDE,
      height: PHOTO_MAX_SIDE,
    })
  })

  it('rejeita dimensões inválidas', () => {
    expect(() => fitPhotoSize({ width: 0, height: 10 })).toThrow(RangeError)
    expect(() => fitPhotoSize({ width: Number.NaN, height: 10 })).toThrow(RangeError)
  })

  it('decodifica, desenha no tamanho reduzido e codifica em JPEG com qualidade 0,8', async () => {
    const source: DecodedPhoto = { width: 4000, height: 3000, close: vi.fn() }
    const rendered = new Blob(['jpeg'], { type: PHOTO_MIME_TYPE })
    const env: PhotoResizeEnv = {
      decode: vi.fn(async () => source),
      render: vi.fn(async () => rendered),
    }
    const original = new Blob(['original'], { type: 'image/png' })

    const result = await resizePhoto(original, env)

    expect(result).toBe(rendered)
    expect(env.decode).toHaveBeenCalledWith(original)
    expect(env.render).toHaveBeenCalledWith(
      source,
      { width: 1280, height: 960 },
      PHOTO_MIME_TYPE,
      PHOTO_QUALITY,
    )
    expect(source.close).toHaveBeenCalledOnce()
  })

  it('protege contra dimensões inválidas vindas do decodificador', async () => {
    const env: PhotoResizeEnv = {
      decode: async () => ({ width: 0, height: 0 }),
      render: vi.fn(async () => new Blob([])),
    }
    await expect(resizePhoto(new Blob([]), env)).rejects.toThrow(RangeError)
    expect(env.render).not.toHaveBeenCalled()
  })
})

describe('foto reduzida fica só no aparelho', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('grava o Blob sem tocar a fila de saída nem a rede', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('rede não permitida')
    })
    const source: DecodedPhoto = { width: 4000, height: 3000 }
    const blob = await resizePhoto(new Blob(['original']), {
      decode: async () => source,
      render: async () => new Blob(['jpeg'], { type: PHOTO_MIME_TYPE }),
    })

    const photo = await putProgressPhoto({ date: '2026-11-26', angle: 'front', blob })

    const stored = (await listProgressPhotos())[0]
    expect(stored?.blob.type).toBe(PHOTO_MIME_TYPE)
    expect(await stored?.blob.text()).toBe('jpeg')
    expect(photo.blob).toBe(blob)
    expect(await countOutbox()).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('usa o idioma ativo para a data da foto', () => {
    expect(formatDate('2026-11-26', 'pt-BR')).toBe('26/11/2026')
    expect(formatDate('2026-11-26', 'en-US')).toBe('11/26/2026')
    expect(formatDate('2026-11-26', 'es-419')).toBe('26/11/2026')
  })
})
