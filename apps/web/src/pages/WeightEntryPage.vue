<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Mood } from '../data/entities'
import { getWeightEntry, listWeightEntries, WeightDateConflictError } from '../data/weights'
import { registerWeight, updateWeight } from '../features/peso/records'
import {
  adjustWeight,
  calendarDate,
  firstDayOfWeek,
  isValidCalendarDate,
  MIN_WEIGHT_KG,
  parseWeightKg,
} from '../features/peso/weight'
import { formatDate, formatNumber } from '../i18n/format'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const today = ref(calendarDate(new Date()))
const selectedDate = ref(today.value)
const weightRaw = ref('')
const note = ref('')
const editingId = ref<string | undefined>()
const originalMood = ref<Mood | undefined>()
const dateDialog = ref(false)
const error = ref('')
const busy = ref(false)

const from = computed(() => (route.query.from === 'history' ? 'history' : 'today'))
const title = computed(() =>
  editingId.value === undefined ? t('weight.entry.titleNew') : t('weight.entry.titleEdit'),
)
const weightValue = computed(() => parseWeightKg(weightRaw.value))
const stepLabel = computed(() => formatNumber(0.1, locale.value, 'weight'))
const dateLabel = computed(() => formatDate(selectedDate.value, locale.value))

onMounted(async () => {
  // RN-08: "hoje" é recalculado ao abrir a tela, no fuso do aparelho.
  today.value = calendarDate(new Date())
  const queryDate = route.query.date
  selectedDate.value =
    typeof queryDate === 'string' && isValidCalendarDate(queryDate) && queryDate <= today.value
      ? queryDate
      : today.value
  const [existing, entries] = await Promise.all([
    getWeightEntry(selectedDate.value),
    listWeightEntries(),
  ])
  if (existing !== undefined) {
    editingId.value = existing.id
    weightRaw.value = formatNumber(existing.weightKg, locale.value)
    note.value = existing.note ?? ''
    originalMood.value = existing.mood
  } else {
    const latest = entries.at(-1)
    if (latest !== undefined) weightRaw.value = formatNumber(latest.weightKg, locale.value)
  }
})

function adjust(delta: number): void {
  const base = weightValue.value ?? MIN_WEIGHT_KG
  weightRaw.value = formatNumber(adjustWeight(base, delta), locale.value)
  error.value = ''
}

async function save(): Promise<void> {
  error.value = ''
  const weightKg = weightValue.value
  if (weightKg === null) {
    error.value = t('weight.entry.errorWeight')
    return
  }
  if (!isValidCalendarDate(selectedDate.value) || selectedDate.value > today.value) {
    error.value = t('weight.entry.errorDate')
    return
  }
  busy.value = true
  try {
    const input = {
      date: selectedDate.value,
      weightKg,
      note: note.value.trim() === '' ? undefined : note.value.trim(),
      ...(originalMood.value === undefined ? {} : { mood: originalMood.value }),
    }
    if (editingId.value === undefined) await registerWeight(input)
    else await updateWeight(editingId.value, input)
    await router.push({ name: from.value })
  } catch (cause) {
    error.value =
      cause instanceof WeightDateConflictError
        ? t('weight.entry.errorDuplicate')
        : t('weight.entry.errorSave')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="entry-layout">
    <v-card class="entry-card">
      <h1 class="type-h2">{{ title }}</h1>
      <div class="entry-weight">
        <v-btn
          icon="mdi-minus"
          variant="text"
          color="primary-text"
          data-testid="weight-decrease"
          :aria-label="t('weight.entry.decrease', { value: stepLabel })"
          @click="adjust(-0.1)"
        />
        <v-text-field
          v-model="weightRaw"
          class="entry-input"
          data-testid="weight-input"
          :label="t('weight.entry.weightLabel')"
          inputmode="decimal"
          variant="outlined"
          hide-details
        />
        <v-btn
          icon="mdi-plus"
          variant="text"
          color="primary-text"
          data-testid="weight-increase"
          :aria-label="t('weight.entry.increase', { value: stepLabel })"
          @click="adjust(0.1)"
        />
      </div>
      <v-text-field
        :model-value="dateLabel"
        data-testid="weight-date"
        :label="t('weight.entry.dateLabel')"
        variant="outlined"
        hide-details
        readonly
        @click="dateDialog = true"
      />
      <v-text-field
        v-model="note"
        data-testid="weight-note"
        :label="t('weight.entry.noteLabel')"
        variant="outlined"
        hide-details
      />
      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
      <div class="entry-actions">
        <v-btn
          data-testid="weight-cancel"
          variant="text"
          color="primary-text"
          @click="router.push({ name: from })"
        >
          {{ t('weight.entry.cancel') }}
        </v-btn>
        <v-btn
          data-testid="weight-save"
          color="primary"
          variant="flat"
          :loading="busy"
          @click="save"
        >
          {{ t('weight.entry.save') }}
        </v-btn>
      </div>
    </v-card>

    <v-dialog v-model="dateDialog" max-width="420">
      <v-card class="entry-card">
        <v-date-picker
          v-model="selectedDate"
          :max="today"
          :locale="locale"
          :first-day-of-week="firstDayOfWeek(locale)"
          @update:model-value="dateDialog = false"
        />
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.entry-layout {
  max-width: 520px;
}

.entry-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.entry-weight {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-input :deep(input) {
  font-size: 40px;
  font-weight: 600;
  line-height: 48px;
  text-align: center;
}

.entry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
