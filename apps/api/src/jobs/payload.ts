import type { ServerLocale } from '../services/locale.js'

/** RF-40: formato Declarative Web Push (8030), idêntico para Safari, Chrome e Firefox. */
export interface DeclarativePushPayload {
  web_push: 8030
  notification: {
    title: string
    body: string
    lang: ServerLocale
    dir: 'ltr'
    navigate: string
    silent: false
  }
}

export const REMINDER_TTL_SECONDS = 6 * 60 * 60

export function buildReminderPayload(input: {
  title: string
  body: string
  locale: ServerLocale
  appOrigin: string
}): DeclarativePushPayload {
  const origin = input.appOrigin.replace(/\/+$/, '')
  return {
    web_push: 8030,
    notification: {
      title: input.title,
      body: input.body,
      lang: input.locale,
      dir: 'ltr',
      navigate: `${origin}/registrar`,
      silent: false,
    },
  }
}
