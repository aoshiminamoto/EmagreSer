import { createRouter, createWebHistory } from 'vue-router'
import { restoreSession } from '../features/conta/session'
import { isOnboardingDone } from '../features/conta/onboarding'
import { isDesktopFlow } from '../features/device/detection'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: () => import('../pages/TodayPage.vue') },
    { path: '/evolucao', name: 'evolution', component: () => import('../pages/EvolutionPage.vue') },
    { path: '/galeria', name: 'gallery', component: () => import('../pages/GalleryPage.vue') },
    { path: '/historico', name: 'history', component: () => import('../pages/HistoryPage.vue') },
    {
      path: '/peso',
      alias: '/registrar',
      name: 'weightEntry',
      component: () => import('../pages/WeightEntryPage.vue'),
    },
    { path: '/metas', name: 'goals', component: () => import('../pages/GoalsPage.vue') },
    { path: '/mais', name: 'more', component: () => import('../pages/MorePage.vue') },
    {
      path: '/configuracoes',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { public: true, guestOnly: true, bare: true },
    },
    {
      path: '/cadastro',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { public: true, guestOnly: true, bare: true },
    },
    {
      path: '/esqueci-a-senha',
      name: 'forgotPassword',
      component: () => import('../pages/ForgotPasswordPage.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/redefinir-senha',
      name: 'resetPassword',
      component: () => import('../pages/ResetPasswordPage.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/privacidade',
      name: 'privacy',
      component: () => import('../pages/PrivacyPage.vue'),
      meta: { public: true, bare: true },
    },
    {
      path: '/boas-vindas',
      name: 'onboarding',
      component: () => import('../pages/OnboardingPage.vue'),
      meta: { bare: true },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  // RN-13: no desktop só a página pública “Sobre e privacidade” é permitida.
  // Não se consulta sessão nem IndexedDB nesse fluxo.
  if (isDesktopFlow() && to.name !== 'privacy') return { name: 'privacy' }
  const authenticated = await restoreSession()
  if (to.meta.public === true) {
    if (authenticated && to.meta.guestOnly === true) {
      return { name: (await isOnboardingDone()) ? 'today' : 'onboarding' }
    }
    return true
  }
  if (!authenticated) return { name: 'login' }
  const done = await isOnboardingDone()
  if (!done && to.name !== 'onboarding') return { name: 'onboarding' }
  if (done && to.name === 'onboarding') return { name: 'today' }
  return true
})
