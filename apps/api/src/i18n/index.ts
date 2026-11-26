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
