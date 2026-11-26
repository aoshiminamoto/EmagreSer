/**
 * RN-11: classificação pura de dispositivo. O chamador (main.ts) coleta os
 * sinais do navegador de forma síncrona e injeta aqui; a largura da janela
 * nunca é usada sozinha.
 */
export interface DeviceSignals {
  userAgent?: string
  userAgentDataMobile?: boolean
  maxTouchPoints?: number
  /** matchMedia('(pointer: coarse) and (hover: none)').matches */
  coarsePointerNoHover?: boolean
}

export type DeviceClass = 'mobile' | 'desktop'

const MOBILE_UA = /android|iphone|ipad|ipod|mobile/i

export function classifyDevice(signals: DeviceSignals): DeviceClass {
  if (signals.userAgentDataMobile === true) return 'mobile'

  const userAgent = signals.userAgent ?? ''
  if (MOBILE_UA.test(userAgent)) return 'mobile'

  // iPadOS recente se apresenta como Mac, mas reporta vários pontos de toque.
  const looksLikeMac = /macintosh/i.test(userAgent)
  if (looksLikeMac && (signals.maxTouchPoints ?? 0) > 1) return 'mobile'

  if (signals.coarsePointerNoHover === true) return 'mobile'

  return 'desktop'
}
