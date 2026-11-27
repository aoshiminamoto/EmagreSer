/**
 * RN-11/RN-13: classificação síncrona no arranque, antes de montar qualquer tela.
 * A regra pura de RN-11 vive em packages/domain, mas o pacote não publica .d.ts e
 * o web compila antes dele (D-36); por isso ela é espelhada aqui, como em D-51.
 * Os testes usam os mesmos User Agents do pacote de domínio.
 */
export type DeviceClass = 'mobile' | 'desktop'

export interface DeviceSignals {
  userAgent?: string
  userAgentDataMobile?: boolean
  maxTouchPoints?: number
  /** matchMedia('(pointer: coarse) and (hover: none)').matches */
  coarsePointerNoHover?: boolean
}

const MOBILE_UA = /android|iphone|ipad|ipod|mobile/i

export function classifyDevice(signals: DeviceSignals): DeviceClass {
  if (signals.userAgentDataMobile === true) return 'mobile'

  const userAgent = signals.userAgent ?? ''
  if (MOBILE_UA.test(userAgent)) return 'mobile'

  // iPadOS recente se apresenta como Mac, mas reporta vários pontos de toque.
  if (/macintosh/i.test(userAgent) && (signals.maxTouchPoints ?? 0) > 1) return 'mobile'

  if (signals.coarsePointerNoHover === true) return 'mobile'

  return 'desktop'
}

/** Coleta os sinais sem rede, sem IndexedDB e sem esperar layout. */
export function collectDeviceSignals(): DeviceSignals {
  const nav = globalThis.navigator
  const uaData = (nav as (Navigator & { userAgentData?: { mobile?: boolean } }) | undefined)
    ?.userAgentData
  return {
    userAgent: nav?.userAgent,
    userAgentDataMobile: typeof uaData?.mobile === 'boolean' ? uaData.mobile : undefined,
    maxTouchPoints: nav?.maxTouchPoints,
    coarsePointerNoHover:
      globalThis.matchMedia?.('(pointer: coarse) and (hover: none)').matches === true,
  }
}

/** O bypass só vale em build de desenvolvimento/teste (RN-13). */
export function allowDesktopBypass(flag: string | undefined, devBuild: boolean): boolean {
  return devBuild && (flag === 'true' || flag === '1')
}

const desktopFlow =
  classifyDevice(collectDeviceSignals()) === 'desktop' &&
  !allowDesktopBypass(import.meta.env.VITE_ALLOW_DESKTOP, import.meta.env.DEV)

export function isDesktopFlow(): boolean {
  return desktopFlow
}

export function isMobileFlow(): boolean {
  return !desktopFlow
}

/** RN-12: não convidar a instalar quando o app já roda instalado. */
export function isInstalledApp(): boolean {
  const nav = globalThis.navigator as (Navigator & { standalone?: boolean }) | undefined
  return (
    nav?.standalone === true ||
    globalThis.matchMedia?.('(display-mode: standalone)').matches === true
  )
}
