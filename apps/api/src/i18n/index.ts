import { enUS } from './en-US.js'
import { es419 } from './es-419.js'
import { ptBR } from './pt-BR.js'
import type { ServerMessages } from './types.js'
import type { ServerLocale } from '../services/locale.js'

const catalogs: Record<ServerLocale, ServerMessages> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-419': es419,
}

export function messagesFor(locale: ServerLocale): ServerMessages {
  return catalogs[locale] ?? ptBR
}

/** RF-40: textos variados e sem dado de saúde; o índice é determinístico por dia. */
export function reminderTextFor(
  locale: ServerLocale,
  index: number,
): { title: string; body: string } {
  const { titles, bodies } = messagesFor(locale).reminder
  return {
    title: titles[index % titles.length] ?? titles[0] ?? '',
    body: bodies[index % bodies.length] ?? bodies[0] ?? '',
  }
}
