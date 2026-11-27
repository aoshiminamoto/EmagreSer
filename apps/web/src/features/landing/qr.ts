/**
 * RF-65: QR Code gerado no cliente por biblioteca empacotada, em SVG.
 * Devolve o caminho do `<path>` para o Vue desenhar sem v-html nem serviço externo.
 */
import { create } from 'qrcode'

export interface QrSvg {
  size: number
  path: string
}

export function qrSvg(value: string): QrSvg {
  const { modules } = create(value, { errorCorrectionLevel: 'M' })
  const { size, data } = modules
  let path = ''
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x] === 1) path += `M${x} ${y}h1v1h-1z`
    }
  }
  return { size, path }
}
