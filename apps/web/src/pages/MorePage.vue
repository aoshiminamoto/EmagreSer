<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SyncStatus from '../components/SyncStatus.vue'

const { t } = useI18n()
</script>

<template>
  <v-container class="placeholder-tab">
    <h1 class="type-h1">{{ t('nav.more') }}</h1>
    <p class="type-body">{{ t('placeholder.body', { tab: t('nav.more') }) }}</p>
    <div class="sync-status-settings">
      <span class="type-caption">{{ t('sync.settingsLabel') }}</span>
      <SyncStatus detailed />
    </div>
  </v-container>
</template>

<style scoped>
.sync-status-settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
}
</style>
