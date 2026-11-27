<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNavigation from './components/BottomNavigation.vue'
import SyncStatus from './components/SyncStatus.vue'
import {
  celebration,
  dismissCelebration,
  startCelebrationListener,
} from './features/metas/celebration'
import MilestoneCelebration from './features/metas/MilestoneCelebration.vue'

const { t, locale } = useI18n()
const route = useRoute()
const bare = computed(() => route.meta.bare === true)
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true })
const stopCelebration = startCelebrationListener()
onUnmounted(stopCelebration)
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
    <v-snackbar v-model="needRefresh" :timeout="-1" location="bottom" color="surface-card">
      <span>{{ t('update.available') }}</span>
      <template #actions>
        <v-btn color="primary-text" variant="text" @click="updateServiceWorker()">
          {{ t('update.action') }}
        </v-btn>
      </template>
    </v-snackbar>
    <MilestoneCelebration :data="celebration" :locale="locale" @close="dismissCelebration" />
  </v-app>
</template>
