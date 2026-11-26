<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <v-container class="placeholder-tab">
    <h1 class="type-h1">{{ t('nav.goals') }}</h1>
    <p class="type-body">{{ t('placeholder.body', { tab: t('nav.goals') }) }}</p>
  </v-container>
</template>
