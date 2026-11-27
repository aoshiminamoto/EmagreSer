/** RN-13: a landing é um chunk separado, carregado só no fluxo desktop. */
import { createApp } from 'vue'
import { i18n } from '../../i18n'
import { vuetify } from '../../plugins/vuetify'
import LandingPage from '../../pages/LandingPage.vue'
import { applyLandingLocale } from './locale'

export async function mountLanding(element: Element): Promise<void> {
  await applyLandingLocale()
  createApp(LandingPage).use(i18n).use(vuetify).mount(element)
}
