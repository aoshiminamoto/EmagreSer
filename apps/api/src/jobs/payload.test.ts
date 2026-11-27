import { describe, expect, it } from 'vitest'
import { buildReminderPayload, REMINDER_TTL_SECONDS } from './payload.js'

describe('formato Declarative Web Push (RF-40)', () => {
  it('gera o JSON exato com navigate absoluto nos três idiomas', () => {
    for (const locale of ['pt-BR', 'en-US', 'es-419'] as const) {
      const payload = buildReminderPayload({
        title: 'Bom dia!',
        body: 'Que tal um registro rápido?',
        locale,
        appOrigin: 'https://app.emagreser.com/',
      })
      expect(payload).toEqual({
        web_push: 8030,
        notification: {
          title: 'Bom dia!',
          body: 'Que tal um registro rápido?',
          lang: locale,
          dir: 'ltr',
          navigate: 'https://app.emagreser.com/registrar',
          silent: false,
        },
      })
      const serialized = JSON.stringify(payload)
      expect(serialized).not.toMatch(/\bkg\b|peso|weight/i)
    }
  })

  it('usa TTL de 6 horas', () => {
    expect(REMINDER_TTL_SECONDS).toBe(6 * 60 * 60)
  })
})
