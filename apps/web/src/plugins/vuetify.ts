import { useI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import {
  VApp,
  VAppBar,
  VBottomNavigation,
  VBtn,
  VCard,
  VCheckbox,
  VContainer,
  VDialog,
  VIcon,
  VMain,
  VSelect,
  VSnackbar,
  VSwitch,
  VTextField,
} from 'vuetify/components'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { i18n } from '../i18n'

export const vuetify = createVuetify({
  components: {
    VApp,
    VAppBar,
    VBottomNavigation,
    VBtn,
    VCard,
    VCheckbox,
    VContainer,
    VDialog,
    VIcon,
    VMain,
    VSelect,
    VSnackbar,
    VSwitch,
    VTextField,
  },
  theme: {
    defaultTheme: 'emagreser',
    themes: {
      emagreser: {
        dark: false,
        colors: {
          primary: '#22C55E',
          'primary-text': '#15803D',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#B91C1C',
          background: '#F8FAFC',
          surface: '#F8FAFC',
          'surface-card': '#FFFFFF',
          'on-primary': '#111827',
          'on-success': '#111827',
          'on-warning': '#111827',
          'on-background': '#111827',
          'on-surface': '#111827',
          'on-surface-card': '#111827',
          text: '#111827',
          'text-secondary': '#6B7280',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'pill', minHeight: 48 },
    VCard: { rounded: 'xl', elevation: 0 },
    VBottomNavigation: { height: 64 },
  },
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
    locale: 'pt-BR',
  },
  date: {
    locale: {
      'pt-BR': 'pt-BR',
      'en-US': 'en-US',
      'es-419': 'es-419',
    },
  },
})
