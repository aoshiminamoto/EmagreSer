<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNavigation from './components/BottomNavigation.vue'
import InstallBanner from './components/InstallBanner.vue'
import SyncStatus from './components/SyncStatus.vue'
import { checkForAppUpdate, startUpdateChecks } from './features/device/app-updates'
import { isMobileFlow } from './features/device/detection'
import {
  celebration,
  dismissCelebration,
  startCelebrationListener,
} from './features/metas/celebration'
import MilestoneCelebration from './features/metas/MilestoneCelebration.vue'
import PostSavePrompts from './features/humor/PostSavePrompts.vue'
import { startPostSaveListener } from './features/humor/queue'

const { t, locale } = useI18n()
const route = useRoute()
const bare = computed(() => route.meta.bare === true)
const mobileFlow = isMobileFlow()
// O reload é nosso: uma verificação externa (visibilitychange/hora) não dispara
// o "controlling" com isUpdate do Workbox, então ele sozinho não recarregaria.
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: mobileFlow,
  onNeedReload: () => {},
})
async function applyUpdate(): Promise<void> {
  globalThis.navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => globalThis.location.reload(),
    { once: true },
  )
  await updateServiceWorker()
}
let stopUpdateChecks: (() => void) | undefined
onMounted(() => {
  if (mobileFlow) stopUpdateChecks = startUpdateChecks({ check: checkForAppUpdate })
})
const stopCelebration = startCelebrationListener()
const stopPostSave = startPostSaveListener()
onUnmounted(() => {
  stopUpdateChecks?.()
  stopCelebration()
  stopPostSave()
})
</script>

<template>
  <v-app>
    <v-app-bar v-if="!bare" flat density="compact" height="48" color="surface-card">
      <template #prepend>
        <span class="type-h3">{{ t('app.title') }}</span>
      </template>
      <template #append>
        <SyncStatus />
      </template>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
    <BottomNavigation v-if="!bare" />
    <InstallBanner v-if="mobileFlow" />
    <v-snackbar v-model="needRefresh" :timeout="-1" location="bottom" color="surface-card">
      <span>{{ t('update.available') }}</span>
      <template #actions>
        <v-btn color="primary-text" variant="text" @click="applyUpdate()">
          {{ t('update.action') }}
        </v-btn>
      </template>
    </v-snackbar>
    <MilestoneCelebration :data="celebration" :locale="locale" @close="dismissCelebration" />
    <PostSavePrompts :blocked="celebration !== null" />
  </v-app>
</template>
