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
  reminder: {
    titles: ['¡Buenos días!', 'Un recordatorio amable', 'Tu pausa de hoy'],
    bodies: [
      '¿Qué tal un registro rápido para acompañar tu camino?',
      'Si puedes, dedica un minuto a tu registro de hoy.',
      'Un registro rápido ayuda a ver tu tendencia con el tiempo.',
    ],
  },
  subject: 'Restablece tu contraseña de EmagreSer',
  body: (url) =>
    `Recibimos una solicitud para restablecer la contraseña de tu cuenta EmagreSer.\n\n` +
    `Abre el enlace siguiente para crear una contraseña nueva. Vale 30 minutos ` +
    `y solo se puede usar una vez:\n${url}\n\n` +
    `Si no fuiste tú, ignora este correo.\n\nEquipo EmagreSer`,
}
