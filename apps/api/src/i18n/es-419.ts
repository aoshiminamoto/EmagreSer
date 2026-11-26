import type { ServerMessages } from './types.js'

// Rascunho: revisión humana pendiente (Fase 12).
export const es419: ServerMessages = {
  subject: 'Restablece tu contraseña de EmagreSer',
  body: (url) =>
    `Recibimos una solicitud para restablecer la contraseña de tu cuenta EmagreSer.\n\n` +
    `Abre el enlace siguiente para crear una contraseña nueva. Vale 30 minutos ` +
    `y solo se puede usar una vez:\n${url}\n\n` +
    `Si no fuiste tú, ignora este correo.\n\nEquipo EmagreSer`,
}
