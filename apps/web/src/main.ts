import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-ext-400.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-ext-600.css'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './styles/main.css'

import { createApp } from 'vue'
import { captureInstallPrompt } from './features/device/install'
import { isDesktopFlow, isMobileFlow } from './features/device/detection'
import { i18n } from './i18n'
import { pinia } from './plugins/pinia'
import { vuetify } from './plugins/vuetify'

// RN-11/RN-13: decidir antes de qualquer await, rede ou IndexedDB. A exceção é
// a página pública “Sobre e privacidade”, que continua acessível no desktop.
const privacyPath = globalThis.location?.pathname.replace(/\/+$/, '') === '/privacidade'
const landingFlow = isDesktopFlow() && !privacyPath

// RN-12: registrar o listener no carregamento inicial, antes de montar o app.
if (isMobileFlow()) captureInstallPrompt()

async function boot(): Promise<void> {
  if (landingFlow) {
    const { mountLanding } = await import('./features/landing/mount')
    const element = globalThis.document.getElementById('app')
    if (element !== null) await mountLanding(element)
    return
  }

  const [{ default: App }, { router }, { restoreSession }, { startClient }] = await Promise.all([
    import('./App.vue'),
    import('./plugins/router'),
    import('./features/conta/session'),
    import('./bootstrap'),
  ])

  // No desktop só a página pública é montada: sem sessão, sincronização ou flags.
  if (isMobileFlow()) {
    try {
      await restoreSession()
    } catch {
      // IndexedDB indisponível: segue como visitante, sem dados locais.
    }
  }

  createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app')
  if (isMobileFlow()) startClient()
}

void boot()
