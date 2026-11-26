import { i18n } from '../../i18n'

/** Códigos estáveis da API viram mensagens do catálogo; nunca texto do servidor. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return i18n.global.t('auth.error.invalidCredentials')
    case 'EMAIL_ALREADY_EXISTS':
      return i18n.global.t('auth.error.emailAlreadyExists')
    case 'TOO_MANY_ATTEMPTS':
      return i18n.global.t('auth.error.tooManyAttempts')
    case 'CONSENT_REQUIRED':
      return i18n.global.t('auth.error.consentRequired')
    case 'INVALID_RESET_TOKEN':
      return i18n.global.t('auth.error.invalidResetToken')
    case 'NETWORK_ERROR':
      return i18n.global.t('auth.error.network')
    default:
      return i18n.global.t('auth.error.generic')
  }
}
