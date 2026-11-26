<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <v-bottom-navigation color="primary-text" grow mandatory>
    <v-btn to="/" :aria-label="t('nav.today')">
      <v-icon icon="mdi-home-outline" />
      <span>{{ t('nav.today') }}</span>
    </v-btn>
    <v-btn to="/evolucao" :aria-label="t('nav.evolution')">
      <v-icon icon="mdi-chart-line" />
      <span>{{ t('nav.evolution') }}</span>
    </v-btn>
    <v-btn to="/historico" :aria-label="t('nav.history')">
      <v-icon icon="mdi-history" />
      <span>{{ t('nav.history') }}</span>
    </v-btn>
    <v-btn to="/metas" :aria-label="t('nav.goals')">
      <v-icon icon="mdi-trophy-outline" />
      <span>{{ t('nav.goals') }}</span>
    </v-btn>
    <v-btn to="/mais" :aria-label="t('nav.more')">
      <v-icon icon="mdi-dots-horizontal" />
      <span>{{ t('nav.more') }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>
