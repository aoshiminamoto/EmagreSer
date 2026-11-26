import type { ServerMessages } from './types.js'

// Rascunho: revisão humana pendente (Fase 12).
export const enUS: ServerMessages = {
  subject: 'Reset your EmagreSer password',
  body: (url) =>
    `We received a request to reset the password of your EmagreSer account.\n\n` +
    `Open the link below to create a new password. It is valid for 30 minutes ` +
    `and can be used only once:\n${url}\n\n` +
    `If you did not request this, ignore this email.\n\nEmagreSer team`,
}
