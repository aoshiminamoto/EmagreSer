<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Milestone, Settings, WeightEntry } from '../data/entities'
import { listMilestones } from '../data/milestones'
import { getSettings } from '../data/settings'
import { listWeightEntries } from '../data/weights'
import TrendChart from '../features/grafico/TrendChart.vue'
import {
  buildTrend,
  isTrendEmpty,
  trendIndicators,
  type TrendPeriod,
} from '../features/grafico/trend'
import { nextPendingMilestone } from '../features/metas/milestones'
import { calendarDate } from '../features/peso/weight'
import { formatNumber } from '../i18n/format'

const { t, locale } = useI18n()
const entries = ref<WeightEntry[]>([])
const milestones = ref<Milestone[]>([])
const settings = ref<Settings | undefined>()
const today = ref(calendarDate(new Date()))
const period = ref<TrendPeriod>('30d')

const periodOptions = computed(() => [
  { value: '30d' as const, label: t('chart.period30') },
  { value: '90d' as const, label: t('chart.period90') },
  { value: '6m' as const, label: t('chart.period6m') },
  { value: 'all' as const, label: t('chart.periodAll') },
])

const points = computed(() => buildTrend(entries.value, period.value, today.value))
const empty = computed(() => isTrendEmpty(points.value))
const indicators = computed(() => trendIndicators(entries.value, today.value))
const next = computed(() => {
  const current = indicators.value.currentKg
  return current === null ? undefined : nextPendingMilestone(milestones.value, current)
})

function weightLabel(value: number | null): string {
  return value === null ? t('chart.noData') : formatNumber(value, locale.value, 'weight')
}

function deltaLabel(value: number | null): string {
  if (value === null) return t('chart.noData')
  return `${value > 0 ? '+' : ''}${formatNumber(value, locale.value, 'weight')}`
}

onMounted(async () => {
  // RF-75/RN-08: a janela de datas é recalculada ao abrir a tela.
  today.value = calendarDate(new Date())
  const [loadedEntries, loadedMilestones, loadedSettings] = await Promise.all([
    listWeightEntries(),
    listMilestones(),
    getSettings(),
  ])
  entries.value = loadedEntries
  milestones.value = loadedMilestones
  settings.value = loadedSettings
})
</script>

<template>
  <v-container class="evolution-layout">
    <h1 class="type-h1">{{ t('nav.evolution') }}</h1>
    <v-card class="chart-card">
      <p class="type-h3">{{ t('chart.title') }}</p>
      <v-btn-toggle
        v-model="period"
        mandatory
        color="primary"
        variant="outlined"
        divided
        density="comfortable"
        class="period-toggle"
        data-testid="chart-period"
      >
        <v-btn
          v-for="option in periodOptions"
          :key="option.value"
          :value="option.value"
          size="small"
        >
          {{ option.label }}
        </v-btn>
      </v-btn-toggle>
      <div v-if="empty" class="chart-empty" data-testid="chart-empty">
        <v-icon icon="mdi-chart-line" size="48" color="text-secondary" />
        <p class="type-body">{{ t('chart.empty') }}</p>
      </div>
      <TrendChart
        v-else
        :points="points"
        :locale="locale"
        :target-kg="settings?.targetWeightKg"
        :next-milestone-kg="next?.milestoneKg"
      />
    </v-card>
    <div v-if="!empty" class="indicators">
      <div class="indicator">
        <p class="type-caption auth-muted">{{ t('chart.current') }}</p>
        <p class="type-h3" data-testid="indicator-current">
          {{ weightLabel(indicators.currentKg) }}
        </p>
      </div>
      <div class="indicator">
        <p class="type-caption auth-muted">{{ t('chart.average') }}</p>
        <p class="type-h3" data-testid="indicator-average">
          {{ weightLabel(indicators.averageKg) }}
        </p>
      </div>
      <div class="indicator">
        <p class="type-caption auth-muted">{{ t('chart.totalChange') }}</p>
        <p class="type-h3" data-testid="indicator-total">
          {{ deltaLabel(indicators.totalChangeKg) }}
        </p>
      </div>
      <div class="indicator">
        <p class="type-caption auth-muted">{{ t('chart.weekChange') }}</p>
        <p class="type-h3" data-testid="indicator-week">
          {{ deltaLabel(indicators.weekChangeKg) }}
        </p>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.evolution-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.period-toggle {
  align-self: flex-start;
  max-width: 100%;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 8px;
  text-align: center;
}

.chart-empty p {
  color: #6b7280;
}

.indicators {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 16px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 8px 24px rgba(17, 24, 39, 0.06),
    0 2px 6px rgba(17, 24, 39, 0.04);
}

.indicator p {
  margin: 0;
}
</style>
