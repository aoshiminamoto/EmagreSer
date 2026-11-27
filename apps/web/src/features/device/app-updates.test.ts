import { describe, expect, it, vi } from 'vitest'
import { startUpdateChecks, UPDATE_CHECK_INTERVAL_MS } from './app-updates'

interface Harness {
  stop: () => void
  addListener: ReturnType<typeof vi.fn>
  removeListener: ReturnType<typeof vi.fn>
  clearTimer: ReturnType<typeof vi.fn>
  fireTimer: () => void
  fireVisibility: () => void
  intervalMs: number
}

function harness(check: () => Promise<void>, visible = true): Harness {
  const addListener = vi.fn()
  const removeListener = vi.fn()
  const clearTimer = vi.fn()
  let timer = () => {}
  let onVisibility = () => {}
  let intervalMs = 0
  const stop = startUpdateChecks({
    check,
    intervalMs: UPDATE_CHECK_INTERVAL_MS,
    isVisible: () => visible,
    addVisibilityListener: (listener) => {
      onVisibility = listener
      addListener(listener)
    },
    removeVisibilityListener: (listener) => {
      removeListener(listener)
    },
    setTimer: (listener, ms) => {
      timer = listener
      intervalMs = ms
      return clearTimer
    },
  })
  return {
    stop,
    addListener,
    removeListener,
    clearTimer,
    fireTimer: () => timer(),
    fireVisibility: () => onVisibility(),
    intervalMs,
  }
}

async function flush(): Promise<void> {
  await Promise.resolve()
}

describe('verificação de nova versão do app', () => {
  it('verifica ao abrir e uma vez por hora', async () => {
    const check = vi.fn(async () => {})
    const h = harness(check)
    await flush()
    expect(check).toHaveBeenCalledTimes(1)
    expect(h.intervalMs).toBe(UPDATE_CHECK_INTERVAL_MS)
    h.fireTimer()
    await flush()
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('verifica ao voltar ao primeiro plano, mas não quando oculto', async () => {
    const hiddenCheck = vi.fn(async () => {})
    const hidden = harness(hiddenCheck, false)
    await flush()
    hidden.fireVisibility()
    await flush()
    expect(hiddenCheck).toHaveBeenCalledTimes(1)
    hidden.stop()

    const visibleCheck = vi.fn(async () => {})
    const visible = harness(visibleCheck)
    await flush()
    visible.fireVisibility()
    await flush()
    expect(visibleCheck).toHaveBeenCalledTimes(2)
    visible.stop()
  })

  it('ao parar remove o listener e cancela o intervalo', () => {
    const h = harness(async () => {})
    const listener = h.addListener.mock.calls[0][0]
    h.stop()
    expect(h.removeListener).toHaveBeenCalledWith(listener)
    expect(h.clearTimer).toHaveBeenCalledOnce()
  })

  it('uma falha na verificação não derruba o app', async () => {
    const check = vi.fn(async () => {
      throw new Error('offline')
    })
    const h = harness(check)
    await flush()
    h.fireTimer()
    await expect(Promise.resolve()).resolves.toBeUndefined()
    expect(check).toHaveBeenCalledTimes(2)
    h.stop()
  })
})
