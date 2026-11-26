import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../pages/TodayPage.vue') },
    { path: '/evolucao', component: () => import('../pages/EvolutionPage.vue') },
    { path: '/historico', component: () => import('../pages/HistoryPage.vue') },
    { path: '/metas', component: () => import('../pages/GoalsPage.vue') },
    { path: '/mais', component: () => import('../pages/MorePage.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
