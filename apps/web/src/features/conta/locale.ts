/** RF-74: idioma disponível conforme flags, escolha imediata e persistida. */
import { setLocalePref } from '../../data/meta'
import { getSettings, saveSettings } from '../../data/settings'
import { getCachedFlags } from '../../flags/client'
import { setLocale, SUPPORTED_LOCALES, type Locale } from '../../i18n'

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** O seletor só aparece com dois ou mais idiomas liberados. */
export async function availableLocales(): Promise<Locale[]> {
  return (await getCachedFlags()).locales.filter(isLocale)
}

export async function changeLocale(locale: Locale): Promise<void> {
  await setLocalePref(locale)
  await setLocale(locale)
  const current = await getSettings()
  if (current !== undefined && current.deleted !== true) await saveSettings({ locale })
}
