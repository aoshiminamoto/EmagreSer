<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarDate, WeightEntry } from '../../data/entities'
import { moodEmoji, moodLabel } from './labels'
import { MOODS, moodDistribution } from './mood'

interface Props {
  entries: readonly WeightEntry[]
  today: CalendarDate
}

const props = defineProps<Props>()
const { t } = useI18n()
const distribution = computed(() => moodDistribution(props.entries, props.today))
const rows = computed(() =>
  MOODS.map((mood) => ({
    mood,
    emoji: moodEmoji(t, mood),
    label: moodLabel(t, mood),
    count: distribution.value[mood],
  })),
)
</script>

<template>
  <v-card class="mood-card" data-testid="mood-distribution">
    <p class="type-h3">{{ t('mood.title') }}</p>
    <p v-if="distribution.total === 0" class="type-body auth-muted" data-testid="mood-empty">
      {{ t('mood.empty') }}
    </p>
    <div v-else class="mood-rows">
      <div
        v-for="row in rows"
        :key="row.mood"
        class="mood-row"
        :data-testid="`mood-count-${row.mood}`"
      >
        <span class="mood-emoji" role="img" :aria-label="row.label">{{ row.emoji }}</span>
        <span class="type-body mood-name">{{ row.label }}</span>
        <span class="type-caption mood-count">{{ row.count }}</span>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.mood-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
}

.mood-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.mood-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mood-emoji {
  font-size: 20px;
}

.mood-name {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mood-count {
  color: #111827;
}
</style>
