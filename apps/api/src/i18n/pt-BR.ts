import type { ServerMessages } from './types.js'

export const ptBR: ServerMessages = {
  csvHeaders: {
    entity: 'Entidade',
    id: 'ID',
    date: 'Data',
    weightKg: 'Peso (kg)',
    milestoneKg: 'Marco (kg)',
    glasses: 'Copos',
    mood: 'Humor',
    note: 'Observação',
    habitKey: 'Chave do hábito',
    habitLabel: 'Nome do hábito',
    active: 'Ativo',
    done: 'Concluído',
    habitId: 'ID do hábito',
    achievedDate: 'Data da conquista',
    settings: 'Configurações',
    clientUpdatedAt: 'Atualizado em',
    deletedAt: 'Excluído em',
  },
  reminder: {
    titles: ['Bom dia!', 'Um lembrete gentil', 'Sua pausa de hoje'],
    bodies: [
      'Que tal um registro rápido para acompanhar sua jornada?',
      'Se der, reserve um minuto para o seu registro de hoje.',
      'Um registro rápido ajuda a mostrar sua tendência com o tempo.',
    ],
  },
  subject: 'Redefina sua senha do EmagreSer',
  body: (url) =>
    `Recebemos um pedido para redefinir a senha da sua conta EmagreSer.\n\n` +
    `Acesse o link abaixo para criar uma nova senha. Ele vale por 30 minutos e ` +
    `pode ser usado uma única vez:\n${url}\n\n` +
    `Se não foi você, ignore este e-mail.\n\nEquipe EmagreSer`,
}
