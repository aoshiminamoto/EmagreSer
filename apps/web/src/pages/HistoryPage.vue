<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Mood, WeightEntry } from '../data/entities'
import { listWeightEntries } from '../data/weights'
import { removeWeight } from '../features/peso/records'
import { calendarDate, daysBetween, roundKg } from '../features/peso/weight'
import { formatDate, formatNumber, formatRelative } from '../i18n/format'

interface HistoryRow {
  entry: WeightEntry
  dateLabel: string
  relativeLabel: string
  weightLabel: string
  variationLabel: string
  moodEmoji?: string
  moodLabel?: string
}

const { t, locale } = useI18n()
const router = useRouter()
const rows = ref<HistoryRow[]>([])
const deleting = ref<WeightEntry | undefined>()
const busy = ref(false)

const emojis = computed<Record<Mood, string>>(() => ({
  feliz: t('mood.feliz'),
  ansioso: t('mood.ansioso'),
  cansado: t('mood.cansado'),
  estressado: t('mood.estressado'),
}))
const moodLabels = computed<Record<Mood, string>>(() => ({
  feliz: t('mood.labelFeliz'),
  ansioso: t('mood.labelAnsioso'),
  cansado: t('mood.labelCansado'),
  estressado: t('mood.labelEstressado'),
}))

onMounted(() => void load())

async function load(): Promise<void> {
  const now = new Date()
  const today = calendarDate(now)
  const descending = (await listWeightEntries()).sort((a, b) => b.date.localeCompare(a.date))
  rows.value = descending.map((entry, index) => {
    const previous = descending[index + 1]
    let variationLabel = t('history.variationFirst')
    if (previous !== undefined) {
      const delta = roundKg(entry.weightKg - previous.weightKg)
      const value = formatNumber(Math.abs(delta), locale.value, 'weight')
      if (delta === 0) variationLabel = t('history.variationSame')
      else if (delta > 0) variationLabel = t('history.variationIncrease', { value })
      else variationLabel = t('history.variationDecrease', { value })
    }
    const days = daysBetween(entry.date, today)
    const mood = entry.mood
    return {
      entry,
      dateLabel: formatDate(entry.date, locale.value),
      relativeLabel: days === 0 || days === 1 ? formatRelative(entry.date, locale.value, now) : '',
      weightLabel: formatNumber(entry.weightKg, locale.value, 'weight'),
      variationLabel,
      ...(mood === undefined
        ? {}
        : { moodEmoji: emojis.value[mood], moodLabel: moodLabels.value[mood] }),
    }
  })
}

function openEdit(entry: WeightEntry): void {
  void router.push({ name: 'weightEntry', query: { date: entry.date, from: 'history' } })
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value
  if (target === undefined) return
  busy.value = true
  try {
    await removeWeight(target.id)
    deleting.value = undefined
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="history-layout">
    <h1 class="type-h1">{{ t('history.title') }}</h1>
    <p v-if="rows.length === 0" class="type-body auth-muted" data-testid="history-empty">
      {{ t('history.empty') }}
    </p>
    <v-virtual-scroll v-else :items="rows" :item-height="88" height="480" class="history-scroll">
      <template #default="{ item }">
        <div class="history-row" :data-testid="`history-row-${item.entry.date}`">
          <div class="history-info">
            <p class="type-body">
              {{ item.dateLabel }}
              <span v-if="item.relativeLabel" class="type-caption auth-muted">{{
                item.relativeLabel
              }}</span>
            </p>
            <p class="type-caption auth-muted">{{ item.variationLabel }}</p>
          </div>
          <span
            v-if="item.moodEmoji"
            class="history-mood"
            role="img"
            :aria-label="item.moodLabel"
            >{{ item.moodEmoji }}</span
          >
          <span class="type-h3 history-weight" data-testid="history-weight">{{
            item.weightLabel
          }}</span>
          <v-btn
            icon="mdi-pencil-outline"
            variant="text"
            color="primary-text"
            :aria-label="t('history.edit')"
            :data-testid="`history-edit-${item.entry.date}`"
            @click="openEdit(item.entry)"
          />
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            color="error"
            :aria-label="t('history.delete')"
            :data-testid="`history-delete-${item.entry.date}`"
            @click="deleting = item.entry"
          />
        </div>
      </template>
    </v-virtual-scroll>
  </v-container>

  <v-dialog
    :model-value="deleting !== undefined"
    max-width="420"
    @update:model-value="deleting = undefined"
  >
    <v-card v-if="deleting" class="history-dialog">
      <h2 class="type-h3">{{ t('history.deleteTitle') }}</h2>
      <p class="type-body">
        {{ t('history.deleteBody', { date: formatDate(deleting.date, locale) }) }}
      </p>
      <div class="history-dialog-actions">
        <v-btn data-testid="history-delete-cancel" variant="text" @click="deleting = undefined">
          {{ t('history.deleteCancel') }}
        </v-btn>
        <v-btn
          data-testid="history-delete-confirm"
          color="error"
          variant="flat"
          :loading="busy"
          @click="confirmDelete"
        >
          {{ t('history.deleteConfirm') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.history-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 88px;
  padding: 8px 4px;
  border-bottom: 1px solid #e5e7eb;
}

.history-info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.history-info p {
  display: flex;
  gap: 6px;
  margin: 0;
}

.history-weight {
  white-space: nowrap;
}

.history-mood {
  font-size: 20px;
}

.history-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}

.history-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
