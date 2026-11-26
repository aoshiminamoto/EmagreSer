import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-ext-400.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-ext-600.css'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './styles/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { startClient } from './bootstrap'
import { i18n } from './i18n'
import { pinia } from './plugins/pinia'
import { router } from './plugins/router'
import { vuetify } from './plugins/vuetify'

createApp(App).use(pinia).use(router).use(i18n).use(vuetify).mount('#app')

// O cliente sincroniza e reavalia flags; até lá tudo funciona offline.
startClient()
