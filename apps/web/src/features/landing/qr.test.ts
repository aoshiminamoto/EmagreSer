import { describe, expect, it } from 'vitest'
import { qrSvg } from './qr'

describe('QR Code da landing (RF-65)', () => {
  it('gera um caminho SVG a partir da URL, sem rede', () => {
    const qr = qrSvg('https://app.emagreser.com')
    expect(qr.size).toBeGreaterThan(20)
    expect(qr.path.startsWith('M')).toBe(true)
    expect(qr.path).toContain('h1v1h-1z')
  })
})
