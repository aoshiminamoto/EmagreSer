import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { applyCacheHeaders } from './static-cache.js'

function headersFor(filePath: string): Record<string, string> {
  const reply = { header: vi.fn() }
  applyCacheHeaders(reply, filePath)
  return Object.fromEntries(reply.header.mock.calls)
}

describe('cabeçalhos de cache da PWA (seção 4.1)', () => {
  it('arquivos com hash em assets são imutáveis', () => {
    expect(headersFor(join('app', 'web', 'dist', 'assets', 'index-a1b2c3.js'))).toEqual({
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  it('shell, service worker e manifest exigem revalidação', () => {
    for (const name of ['index.html', 'sw.js', 'manifest.webmanifest']) {
      expect(headersFor(join('app', 'web', 'dist', name))).toEqual({
        'Cache-Control': 'no-cache',
      })
    }
  })

  it('outros arquivos não recebem diretiva de cache', () => {
    expect(headersFor(join('app', 'web', 'dist', 'icons', 'icon-192.png'))).toEqual({})
  })
})
