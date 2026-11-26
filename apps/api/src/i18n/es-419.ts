import type { ServerMessages } from './types.js'

// Rascunho: revisión humana pendiente (Fase 12).
export const es419: ServerMessages = {
  csvHeaders: {
    entity: 'Entidad',
    id: 'ID',
    date: 'Fecha',
    weightKg: 'Peso (kg)',
    milestoneKg: 'Hito (kg)',
    glasses: 'Vasos',
    mood: 'Ánimo',
    note: 'Nota',
    habitKey: 'Clave del hábito',
    habitLabel: 'Nombre del hábito',
    active: 'Activo',
    done: 'Completado',
    habitId: 'ID del hábito',
    achievedDate: 'Fecha de logro',
    settings: 'Configuración',
    clientUpdatedAt: 'Actualizado el',
    deletedAt: 'Eliminado el',
  },
  subject: 'Restablece tu contraseña de EmagreSer',
  body: (url) =>
    `Recibimos una solicitud para restablecer la contraseña de tu cuenta EmagreSer.\n\n` +
    `Abre el enlace siguiente para crear una contraseña nueva. Vale 30 minutos ` +
    `y solo se puede usar una vez:\n${url}\n\n` +
    `Si no fuiste tú, ignora este correo.\n\nEquipo EmagreSer`,
}
