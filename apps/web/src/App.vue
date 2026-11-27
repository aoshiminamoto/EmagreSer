<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNavigation from './components/BottomNavigation.vue'
import InstallBanner from './components/InstallBanner.vue'
import SyncStatus from './components/SyncStatus.vue'
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
// RN-12/RN-13: service worker apenas no fluxo móvel; desktop nunca registra.
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: isMobileFlow() })
const stopCelebration = startCelebrationListener()
const stopPostSave = startPostSaveListener()
onUnmounted(() => {
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
    <InstallBanner v-if="isMobileFlow()" />
    <v-snackbar v-model="needRefresh" :timeout="-1" location="bottom" color="surface-card">
      <span>{{ t('update.available') }}</span>
      <template #actions>
        <v-btn color="primary-text" variant="text" @click="updateServiceWorker()">
          {{ t('update.action') }}
        </v-btn>
      </template>
    </v-snackbar>
    <MilestoneCelebration :data="celebration" :locale="locale" @close="dismissCelebration" />
    <PostSavePrompts :blocked="celebration !== null" />
  </v-app>
</template>
