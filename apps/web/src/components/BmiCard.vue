<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WeightEntry } from '../data/entities'
import { bmiCategory, calculateBmi, type BmiCategory } from '../features/peso/bmi'
import { latestWeight } from '../features/peso/weight'
import { formatNumber } from '../i18n/format'

const props = defineProps<{
  entries: WeightEntry[]
  heightCm?: number | null
}>()
const emit = defineEmits<{ hide: [] }>()
const { t, locale } = useI18n()

const height = computed(() => (typeof props.heightCm === 'number' ? props.heightCm : undefined))
const latest = computed(() => latestWeight(props.entries))
const initial = computed(() => {
  const active = props.entries
    .filter((entry) => entry.deleted !== true)
    .sort((a, b) => a.date.localeCompare(b.date))
  return active[0]
})
const currentBmi = computed(() =>
  height.value !== undefined && latest.value !== null
    ? calculateBmi(latest.value.weightKg, height.value)
    : null,
)
const initialBmi = computed(() =>
  height.value !== undefined && initial.value !== undefined
    ? calculateBmi(initial.value.weightKg, height.value)
    : null,
)
const category = computed(() => (currentBmi.value === null ? null : bmiCategory(currentBmi.value)))

/** Chaves literais: o check de i18n exige cada rótulo usado explicitamente. */
function categoryLabel(value: BmiCategory | null): string {
  switch (value) {
    case 'underweight':
      return t('bmi.category.underweight')
    case 'adequate':
      return t('bmi.category.adequate')
    case 'overweight':
      return t('bmi.category.overweight')
    case 'obesity1':
      return t('bmi.category.obesity1')
    case 'obesity2':
      return t('bmi.category.obesity2')
    case 'obesity3':
      return t('bmi.category.obesity3')
    default:
      return ''
  }
}

function valueLabel(value: number | null): string {
  return value === null ? t('chart.noData') : formatNumber(value, locale.value, 'bmi')
}
</script>

<template>
  <v-card v-if="currentBmi !== null" class="bmi-card" data-testid="bmi-card">
    <div class="bmi-heading">
      <div>
        <p class="type-caption auth-muted">{{ t('bmi.card') }}</p>
        <p class="type-h1" data-testid="bmi-value">{{ valueLabel(currentBmi) }}</p>
        <p class="type-body" data-testid="bmi-category">{{ categoryLabel(category) }}</p>
      </div>
      <v-btn
        icon="mdi-eye-off-outline"
        variant="text"
        color="text-secondary"
        :aria-label="t('bmi.hide')"
        :title="t('bmi.hide')"
        data-testid="bmi-hide"
        @click="emit('hide')"
      />
    </div>
    <p class="type-caption bmi-start" data-testid="bmi-start">
      {{ t('bmi.start', { value: valueLabel(initialBmi) }) }}
    </p>
    <p class="type-caption bmi-note" data-testid="bmi-note">{{ t('bmi.note') }}</p>
  </v-card>
</template>

<style scoped>
.bmi-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.bmi-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.bmi-heading p {
  margin: 0;
}

.bmi-start {
  color: #374151;
}

.bmi-note {
  color: #6b7280;
}
</style>
