/** RF-33: a imagem é reduzida no aparelho antes de virar Blob no IndexedDB. */
export const PHOTO_MAX_SIDE = 1280
export const PHOTO_QUALITY = 0.8
export const PHOTO_MIME_TYPE = 'image/jpeg'

export const PHOTO_ANGLES = ['front', 'side', 'back'] as const
export type PhotoAngle = (typeof PHOTO_ANGLES)[number]

/** Tipos do DOM reexportados para os componentes Vue. */
export type PhotoFileInput = HTMLInputElement
export type PhotoChangeEvent = Event

export interface PhotoSize {
  width: number
  height: number
}

/** Mantém a proporção e limita o maior lado; a codificação JPEG fica em `render`. */
export function fitPhotoSize(size: PhotoSize, maxSide = PHOTO_MAX_SIDE): PhotoSize {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0 ||
    !Number.isFinite(maxSide) ||
    maxSide <= 0
  ) {
    throw new RangeError('INVALID_IMAGE_SIZE')
  }
  const longest = Math.max(size.width, size.height)
  if (longest <= maxSide) return { width: size.width, height: size.height }
  const ratio = maxSide / longest
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  }
}

/** Imagem decodificada; `close` libera a memória do bitmap quando existe. */
export interface DecodedPhoto extends PhotoSize {
  close?: () => void
}

/**
 * As duas operações que dependem do navegador são injetáveis para teste:
 * `decode` lê o arquivo e `render` desenha no canvas e codifica em JPEG.
 */
export interface PhotoResizeEnv {
  decode(blob: Blob): Promise<DecodedPhoto>
  render(source: DecodedPhoto, size: PhotoSize, mimeType: string, quality: number): Promise<Blob>
}

const browserEnv: PhotoResizeEnv = {
  decode(blob) {
    return createImageBitmap(blob)
  },
  async render(source, size, mimeType, quality) {
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('CANVAS_UNAVAILABLE')
    context.drawImage(source as CanvasImageSource, 0, 0, size.width, size.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result !== null) resolve(result)
          else reject(new Error('ENCODE_FAILED'))
        },
        mimeType,
        quality,
      )
    })
  },
}

export async function resizePhoto(blob: Blob, env: PhotoResizeEnv = browserEnv): Promise<Blob> {
  const source = await env.decode(blob)
  try {
    return await env.render(source, fitPhotoSize(source), PHOTO_MIME_TYPE, PHOTO_QUALITY)
  } finally {
    source.close?.()
  }
}
