import { describe, expect, it, vi } from 'vitest'
import {
  clearAppCaches,
  deleteAccount,
  deliverExport,
  fetchExport,
  isOffline,
  type DeleteAccountDeps,
  type FileDelivery,
} from './account'

function response(body: string, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(body, { status, headers })
}

function deps(overrides: Partial<DeleteAccountDeps> = {}): DeleteAccountDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    removeOnServer: async () => {
      calls.push('server')
    },
    unsubscribeLocal: async () => {
      calls.push('push')
    },
    forgetSession: async () => {
      calls.push('session')
    },
    clearLocal: async () => {
      calls.push('local')
    },
    clearCaches: async () => {
      calls.push('caches')
    },
    ...overrides,
  }
}

describe('fetchExport (RF-44)', () => {
  it('usa o nome do cabeçalho e o blob devolvidos pela API', async () => {
    const file = await fetchExport('csv', async () =>
      response('a,b', {
        'content-disposition': 'attachment; filename="emagreser-2026-11-26.csv"',
        'content-type': 'text/csv',
      }),
    )
    expect(file.filename).toBe('emagreser-2026-11-26.csv')
    expect(await file.blob.text()).toBe('a,b')
  })

  it('tem nome fallback e rejeita resposta sem sucesso', async () => {
    const file = await fetchExport('json', async () => response('{}'))
    expect(file.filename).toMatch(/^emagreser-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(fetchExport('json', async () => response('', {}, 500))).rejects.toThrow(
      'EXPORT_FAILED',
    )
  })
})

describe('deliverExport (RF-44)', () => {
  const file = { blob: new Blob(['dados']), filename: 'dados.json' }

  it('compartilha quando o navegador oferece share com arquivos', async () => {
    const share = vi.fn(async () => {})
    const download = vi.fn()
    const delivery: FileDelivery = { canShare: true, share, download }
    await deliverExport(file, delivery)
    expect(share).toHaveBeenCalledOnce()
    expect(download).not.toHaveBeenCalled()
  })

  it('faz download sem share e também se o compartilhamento falhar', async () => {
    const download = vi.fn()
    await deliverExport(file, {
      canShare: false,
      share: async () => {},
      download,
    })
    await deliverExport(file, {
      canShare: true,
      share: async () => {
        throw new Error('cancelado')
      },
      download,
    })
    expect(download).toHaveBeenCalledTimes(2)
  })
})

describe('exclusão da conta (RF-45)', () => {
  it('apaga no servidor antes de limpar o aparelho, nesta ordem', async () => {
    const subject = deps()
    await deleteAccount(subject)
    expect(subject.calls).toEqual(['server', 'push', 'session', 'local', 'caches'])
  })

  it('não apaga nada localmente se o servidor recusar', async () => {
    const subject = deps({
      removeOnServer: async () => {
        subject.calls.push('server')
        throw new Error('INVALID_PASSWORD')
      },
    })
    await expect(deleteAccount(subject)).rejects.toThrow('INVALID_PASSWORD')
    expect(subject.calls).toEqual(['server'])
  })

  it('limpa os caches disponíveis e reconhece offline', async () => {
    const storage = {
      keys: async () => ['precache', 'imagens'],
      delete: vi.fn(async (_key: string) => true),
    }
    await clearAppCaches(storage)
    expect(storage.delete.mock.calls.map(([key]) => key)).toEqual(['precache', 'imagens'])
    await clearAppCaches(undefined)
    expect(isOffline({ onLine: false })).toBe(true)
    expect(isOffline({ onLine: true })).toBe(false)
    expect(isOffline(undefined)).toBe(false)
  })
})
