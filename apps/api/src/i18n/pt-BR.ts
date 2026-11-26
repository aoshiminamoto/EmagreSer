import type { ServerMessages } from './types.js'

export const ptBR: ServerMessages = {
  subject: 'Redefina sua senha do EmagreSer',
  body: (url) =>
    `Recebemos um pedido para redefinir a senha da sua conta EmagreSer.\n\n` +
    `Acesse o link abaixo para criar uma nova senha. Ele vale por 30 minutos e ` +
    `pode ser usado uma única vez:\n${url}\n\n` +
    `Se não foi você, ignore este e-mail.\n\nEquipe EmagreSer`,
}
