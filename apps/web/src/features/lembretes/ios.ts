/** 4.6: no iOS o Web Push exige o app instalado pela Tela de Início (16.4+). */

export function detectIOS(
  userAgent = globalThis.navigator?.userAgent ?? '',
  maxTouchPoints = globalThis.navigator?.maxTouchPoints ?? 0,
): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

export function isStandalone(windowRef: Window = globalThis.window): boolean {
  const navigatorRef = windowRef.navigator as Navigator & { standalone?: boolean }
  return (
    navigatorRef.standalone === true ||
    windowRef.matchMedia?.('(display-mode: standalone)').matches === true
  )
}

export function needsInstallNotice(
  userAgent?: string,
  maxTouchPoints?: number,
  windowRef?: Window,
): boolean {
  const ios = userAgent === undefined ? detectIOS() : detectIOS(userAgent, maxTouchPoints ?? 0)
  const standalone = windowRef === undefined ? isStandalone() : isStandalone(windowRef)
  return ios && !standalone
}
