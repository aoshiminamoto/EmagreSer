import { describe, expect, it } from 'vitest'
import { classifyDevice } from './device.js'

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const FIREFOX_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
const SAFARI_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
const IPADOS_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

describe('classificação de dispositivo (RN-11)', () => {
  it('classifica Android, iPhone e iPad como móveis', () => {
    expect(classifyDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0' })).toBe(
      'mobile',
    )
    expect(classifyDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2)' })).toBe('mobile')
    expect(classifyDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2)' })).toBe('mobile')
  })

  it('classifica iPadOS que se identifica como Mac como móvel', () => {
    expect(classifyDevice({ userAgent: IPADOS_AS_MAC, maxTouchPoints: 5 })).toBe('mobile')
  })

  it('classifica desktop Chrome, Firefox e Safari como desktop', () => {
    expect(classifyDevice({ userAgent: CHROME_DESKTOP, maxTouchPoints: 0 })).toBe('desktop')
    expect(classifyDevice({ userAgent: FIREFOX_DESKTOP })).toBe('desktop')
    expect(classifyDevice({ userAgent: SAFARI_DESKTOP, maxTouchPoints: 0 })).toBe('desktop')
  })

  it('não classifica janela estreita de desktop como móvel', () => {
    expect(
      classifyDevice({
        userAgent: CHROME_DESKTOP,
        coarsePointerNoHover: false,
        maxTouchPoints: 0,
      }),
    ).toBe('desktop')
  })

  it('prefere userAgentData.mobile quando presente', () => {
    expect(classifyDevice({ userAgent: CHROME_DESKTOP, userAgentDataMobile: true })).toBe('mobile')
    expect(
      classifyDevice({ userAgent: IPADOS_AS_MAC, userAgentDataMobile: false, maxTouchPoints: 5 }),
    ).toBe('mobile')
  })

  it('usa ponteiro grosso sem hover como desempate', () => {
    expect(
      classifyDevice({ userAgent: 'Mozilla/5.0 (X11; Linux)', coarsePointerNoHover: true }),
    ).toBe('mobile')
  })
})
