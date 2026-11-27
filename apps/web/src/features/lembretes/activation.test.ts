import { afterEach, describe, expect, it, vi } from 'vitest'
import { activateReminder, deactivateReminder, type ActivationDeps } from './activation'
import { detectIOS, isStandalone, needsInstallNotice } from './ios'
import { subscribeLocal, urlBase64ToUint8Array } from './subscription'

afterEach(() => {
  vi.unstubAllGlobals()
})

function deps(overrides: Partial<ActivationDeps> = {}): ActivationDeps {
  return {
    notification: {
      permission: 'granted',
      requestPermission: vi.fn(async (): Promise<NotificationPermission> => 'granted'),
    },
    iosInstallRequired: false,
    publicKey: vi.fn(async () => 'chave-publica'),
    subscribe: vi.fn(async () => ({
      endpoint: 'https://push.example.com/1',
      keys: { p256dh: 'p', auth: 'a' },
    })),
    register: vi.fn(async () => {}),
    enable: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('ativação do lembrete (RF-41)', () => {
  it('pede permissão antes de qualquer chamada de rede e conclui a inscrição', async () => {
    const order: string[] = []
    const input = deps({
      notification: {
        permission: 'default',
        requestPermission: async () => {
          order.push('permission')
          return 'granted'
        },
      },
      publicKey: async () => {
        order.push('key')
        return 'chave'
      },
      subscribe: async () => {
        order.push('subscribe')
        return { endpoint: 'https://push.example.com/1', keys: { p256dh: 'p', auth: 'a' } }
      },
      register: async () => {
        order.push('register')
      },
      enable: async () => {
        order.push('enable')
      },
    })

    expect(await activateReminder(input)).toBe('active')
    expect(order).toEqual(['permission', 'key', 'subscribe', 'register', 'enable'])
  })

  it('explica permissão negada e não cadastra inscrição', async () => {
    const input = deps({
      notification: {
        permission: 'denied',
        requestPermission: vi.fn(async (): Promise<NotificationPermission> => 'denied'),
      },
    })
    expect(await activateReminder(input)).toBe('denied')
    expect(input.register).not.toHaveBeenCalled()
  })

  it('exige instalação no iOS e trata ausência de suporte ou de chave', async () => {
    expect(await activateReminder(deps({ iosInstallRequired: true }))).toBe('requires-install')
    expect(await activateReminder(deps({ notification: undefined }))).toBe('unsupported')
    expect(await activateReminder(deps({ publicKey: vi.fn(async () => '') }))).toBe('unavailable')
    expect(await activateReminder(deps({ subscribe: vi.fn(async () => undefined) }))).toBe(
      'unsupported',
    )
  })

  it('ao desativar remove a inscrição local, a remota e desliga a configuração', async () => {
    const local = vi.fn(async () => ({
      endpoint: 'https://push.example.com/1',
      keys: { p256dh: 'p', auth: 'a' },
    }))
    const unsubscribeLocal = vi.fn(async () => {})
    const unregister = vi.fn(async () => {})
    const disable = vi.fn(async () => {})

    await deactivateReminder({ local, unsubscribeLocal, unregister, disable })

    expect(unregister).toHaveBeenCalledWith('https://push.example.com/1')
    expect(unsubscribeLocal).toHaveBeenCalledOnce()
    expect(disable).toHaveBeenCalledOnce()
  })

  it('converte a chave VAPID base64url', () => {
    const bytes = urlBase64ToUint8Array('AQID')
    expect([...bytes]).toEqual([1, 2, 3])
  })

  it('prefere window.pushManager e sempre passa userVisibleOnly', async () => {
    const subscribe = vi.fn(async () => ({
      toJSON: () => ({ endpoint: 'https://push.example.com/1', keys: { p256dh: 'p', auth: 'a' } }),
    }))
    vi.stubGlobal('window', { pushManager: { subscribe } })
    vi.stubGlobal('navigator', {})

    const result = await subscribeLocal('AQID')

    expect(result?.endpoint).toBe('https://push.example.com/1')
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    )
  })

  it('usa registration.pushManager quando window.pushManager não existe', async () => {
    const subscribe = vi.fn(async () => ({
      toJSON: () => ({ endpoint: 'https://push.example.com/2', keys: { p256dh: 'p', auth: 'a' } }),
    }))
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) },
    })

    const result = await subscribeLocal('AQID')

    expect(result?.endpoint).toBe('https://push.example.com/2')
    expect(subscribe).toHaveBeenCalledOnce()
  })
})

describe('aviso de instalação no iOS (4.6)', () => {
  const standaloneWindow = {
    navigator: { standalone: true },
    matchMedia: () => ({ matches: false }),
  } as unknown as Window
  const browserWindow = {
    navigator: {},
    matchMedia: () => ({ matches: false }),
  } as unknown as Window

  it('reconhece iPhone, iPad e iPadOS disfarçado de Mac', () => {
    expect(detectIOS('iPhone', 0)).toBe(true)
    expect(detectIOS('iPad', 0)).toBe(true)
    expect(detectIOS('Macintosh', 5)).toBe(true)
    expect(detectIOS('Macintosh', 0)).toBe(false)
    expect(detectIOS('Linux', 0)).toBe(false)
  })

  it('só avisa quando não está instalado', () => {
    expect(isStandalone(standaloneWindow)).toBe(true)
    expect(isStandalone(browserWindow)).toBe(false)
    expect(needsInstallNotice('iPhone', 0, browserWindow)).toBe(true)
    expect(needsInstallNotice('iPhone', 0, standaloneWindow)).toBe(false)
    expect(needsInstallNotice('Android', 0, browserWindow)).toBe(false)
  })
})
