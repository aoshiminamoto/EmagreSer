<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { WeightEntry } from '../data/entities'
import { listWeightEntries } from '../data/weights'
import { latestWeight } from '../features/peso/weight'
import { formatDate, formatNumber, formatRelative } from '../i18n/format'

const { t, locale } = useI18n()
const router = useRouter()
const entries = ref<WeightEntry[]>([])
const now = ref(new Date())
const latest = computed(() => latestWeight(entries.value))

onMounted(async () => {
  // RN-08: recalcula "hoje" e a lista ao abrir a tela.
  now.value = new Date()
  entries.value = await listWeightEntries()
})

function openRegister(): void {
  void router.push({ name: 'weightEntry', query: { from: 'today' } })
}
</script>

<template>
  <v-container class="today-layout">
    <h1 class="type-h1">{{ t('nav.today') }}</h1>
    <v-card class="today-card">
      <p class="type-caption">{{ t('weight.today.current') }}</p>
      <p v-if="latest" class="type-h1 today-weight" data-testid="current-weight">
        {{ formatNumber(latest.weightKg, locale, 'weight') }}
      </p>
      <p v-else class="type-body" data-testid="current-weight">{{ t('weight.today.empty') }}</p>
      <p v-if="latest" class="type-caption auth-muted">
        {{
          t('weight.today.updatedOn', {
            date: formatDate(latest.date, locale),
            relative: formatRelative(latest.date, locale, now),
          })
        }}
      </p>
    </v-card>
    <v-btn color="primary" variant="flat" block data-testid="register-weight" @click="openRegister">
      {{ t('weight.today.record') }}
    </v-btn>
  </v-container>
</template>

<style scoped>
.today-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.today-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 24px;
}

.today-weight {
  color: #15803d;
}
</style>
