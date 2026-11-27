<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { APP_VERSION } from '../version'

const { t } = useI18n()
</script>

<template>
  <v-container class="auth-layout">
    <v-card class="auth-card privacy-card">
      <h1 class="type-h1">{{ t('privacy.title') }}</h1>
      <p class="type-body auth-muted">{{ t('privacy.subtitle') }}</p>
      <h2 class="type-h3">{{ t('privacy.accountTitle') }}</h2>
      <p class="type-body">{{ t('privacy.data') }}</p>
      <p class="type-body">{{ t('privacy.storage') }}</p>
      <p class="type-body">{{ t('privacy.accountData') }}</p>
      <h2 class="type-h3">{{ t('privacy.photosTitle') }}</h2>
      <p class="type-body">{{ t('privacy.photos') }}</p>
      <p class="type-body">{{ t('privacy.noSale') }}</p>
      <p class="type-body">{{ t('privacy.noAnalytics') }}</p>
      <p class="type-body">{{ t('privacy.publicPage') }}</p>
      <p class="type-caption auth-muted" data-testid="privacy-version">
        {{ t('privacy.version', { version: APP_VERSION }) }}
      </p>
      <p class="type-body privacy-disclaimer" role="note" data-testid="privacy-disclaimer">
        {{ t('privacy.disclaimer') }}
      </p>
      <div class="auth-links">
        <router-link :to="{ name: 'login' }">{{ t('privacy.back') }}</router-link>
      </div>
    </v-card>
  </v-container>
</template>

<style scoped>
.privacy-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.privacy-card h1,
.privacy-card h2,
.privacy-card p {
  margin: 0;
}

.privacy-disclaimer {
  margin-top: 12px;
}
</style>
