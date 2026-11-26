<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <v-container class="auth-layout">
    <v-card class="auth-card">
      <h1 class="type-h1">{{ t('privacy.title') }}</h1>
      <p class="type-body">{{ t('privacy.data') }}</p>
      <p class="type-body">{{ t('privacy.storage') }}</p>
      <p class="type-body">{{ t('privacy.photos') }}</p>
      <div class="auth-links">
        <router-link :to="{ name: 'login' }">{{ t('auth.forgot.back') }}</router-link>
      </div>
    </v-card>
  </v-container>
</template>
