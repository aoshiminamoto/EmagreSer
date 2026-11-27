/** Uma hora: PWAs instaladas raramente recarregam sozinhas. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/** Pergunta ao navegador se existe uma versão mais nova do app shell. */
export async function checkForAppUpdate(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  await registration?.update()
}

export interface UpdateCheckerOptions {
  check: () => Promise<void>
  addVisibilityListener?: (listener: () => void) => void
  removeVisibilityListener?: (listener: () => void) => void
  isVisible?: () => boolean
  setTimer?: (listener: () => void, intervalMs: number) => () => void
  intervalMs?: number
}

/**
 * Verifica ao abrir, ao voltar ao primeiro plano e a cada hora com o app aberto.
 * Nunca recarrega sozinho: o snackbar de "Nova versão disponível" decide isso.
 */
export function startUpdateChecks(options: UpdateCheckerOptions): () => void {
  const {
    check,
    addVisibilityListener = (listener) => document.addEventListener('visibilitychange', listener),
    removeVisibilityListener = (listener) =>
      document.removeEventListener('visibilitychange', listener),
    isVisible = () => document.visibilityState === 'visible',
    setTimer = (listener, intervalMs) => {
      const id = setInterval(listener, intervalMs)
      return () => clearInterval(id)
    },
    intervalMs = UPDATE_CHECK_INTERVAL_MS,
  } = options

  const safeCheck = (): void => {
    void Promise.resolve()
      .then(check)
      .catch(() => {
        // Uma falha de rede não pode interromper o uso offline do app.
      })
  }

  safeCheck()
  const onVisibilityChange = (): void => {
    if (isVisible()) safeCheck()
  }
  addVisibilityListener(onVisibilityChange)
  const clearTimer = setTimer(safeCheck, intervalMs)

  return () => {
    removeVisibilityListener(onVisibilityChange)
    clearTimer()
  }
}
