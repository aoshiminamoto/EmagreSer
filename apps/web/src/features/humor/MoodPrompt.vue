<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Mood } from '../../data/entities'
import { moodEmoji, moodLabel } from './labels'

interface Props {
  open: boolean
}

defineProps<Props>()
const emit = defineEmits<{ choose: [mood: Mood]; skip: [] }>()
const { t } = useI18n()

const options = computed<{ key: Mood; emoji: string; label: string }[]>(() => [
  { key: 'feliz', emoji: moodEmoji(t, 'feliz'), label: moodLabel(t, 'feliz') },
  { key: 'ansioso', emoji: moodEmoji(t, 'ansioso'), label: moodLabel(t, 'ansioso') },
  { key: 'cansado', emoji: moodEmoji(t, 'cansado'), label: moodLabel(t, 'cansado') },
  { key: 'estressado', emoji: moodEmoji(t, 'estressado'), label: moodLabel(t, 'estressado') },
])
</script>

<template>
  <v-dialog :model-value="open" max-width="420" persistent data-testid="mood-dialog">
    <v-card class="mood-card" data-testid="mood-prompt">
      <h2 class="type-h3">{{ t('mood.promptTitle') }}</h2>
      <p class="type-body auth-muted">{{ t('mood.promptBody') }}</p>
      <div class="mood-options">
        <v-btn
          v-for="option in options"
          :key="option.key"
          variant="outlined"
          color="primary-text"
          class="mood-option"
          :data-testid="`mood-${option.key}`"
          @click="emit('choose', option.key)"
        >
          <span class="mood-emoji" aria-hidden="true">{{ option.emoji }}</span>
          <span>{{ option.label }}</span>
        </v-btn>
      </div>
      <v-btn variant="text" color="primary-text" data-testid="mood-skip" @click="emit('skip')">
        {{ t('mood.skip') }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mood-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px 24px;
}

.mood-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mood-option {
  height: 64px;
}

.mood-emoji {
  margin-right: 8px;
  font-size: 22px;
}
</style>
