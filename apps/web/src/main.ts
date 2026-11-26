import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-ext-400.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-ext-600.css'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './styles/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import type { Locale } from './i18n'
import { i18n, setLocale, SUPPORTED_LOCALES } from './i18n'
import { pinia } from './plugins/pinia'
import { router } from './plugins/router'
import { vuetify } from './plugins/vuetify'

// O idioma escolhido fica no aparelho; os catálogos não carregados vêm do precache.
const savedLocale = localStorage.getItem('emagreser.locale')
if (savedLocale && (SUPPORTED_LOCALES as readonly string[]).includes(savedLocale)) {
  void setLocale(savedLocale as Locale)
}

createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app')
