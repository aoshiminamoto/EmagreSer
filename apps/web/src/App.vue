<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNavigation from './components/BottomNavigation.vue'

const { t } = useI18n()
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true })
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <BottomNavigation />
    <v-snackbar v-model="needRefresh" :timeout="-1" location="bottom" color="surface-card">
      <span>{{ t('update.available') }}</span>
      <template #actions>
        <v-btn color="primary-text" variant="text" @click="updateServiceWorker()">
          {{ t('update.action') }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>
