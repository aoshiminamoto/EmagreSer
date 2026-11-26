import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { messagesFor } from '../i18n/index.js'
import { serverLocaleFor, type ServerLocale } from './locale.js'

const transporter = nodemailer.createTransport(config.smtpUrl)

/** Envia o link de recuperação no idioma efetivo do usuário (RF-49/RF-78). */
export async function sendPasswordResetMail(
  userId: string,
  email: string,
  token: string,
): Promise<ServerLocale> {
  const locale = await serverLocaleFor(userId, email)
  const message = messagesFor(locale)
  const url = `${config.appOrigin}/redefinir-senha?token=${encodeURIComponent(token)}`
  await transporter.sendMail({
    from: config.mailFrom,
    to: email,
    subject: message.subject,
    text: message.body(url),
    headers: { 'Content-Language': locale },
  })
  return locale
}
