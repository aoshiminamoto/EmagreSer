<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNumber } from '../../i18n/format'
import type { CelebrationSelection } from './milestones'

interface Props {
  data: CelebrationSelection | null
  locale: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const milestoneLabel = computed(() =>
  props.data === null ? '' : formatNumber(props.data.milestoneKg, props.locale, 'weight'),
)
const message = computed(() => {
  if (props.data === null) return ''
  if (props.data.count > 1) {
    return t('goals.celebrationMany', { count: props.data.count, value: milestoneLabel.value })
  }
  return t('goals.celebrationOne', { value: milestoneLabel.value })
})

const confetti = [
  { left: 12, color: '#22C55E', delay: 0 },
  { left: 27, color: '#10B981', delay: 0.4 },
  { left: 42, color: '#F59E0B', delay: 0.2 },
  { left: 58, color: '#22C55E', delay: 0.7 },
  { left: 73, color: '#6B7280', delay: 0.1 },
  { left: 88, color: '#F59E0B', delay: 0.5 },
]

function onUpdate(value: boolean): void {
  if (!value) emit('close')
}
</script>

<template>
  <v-dialog
    :model-value="data !== null"
    fullscreen
    persistent
    data-testid="celebration-dialog"
    @update:model-value="onUpdate"
  >
    <div class="celebration" data-testid="celebration">
      <div class="celebration-confetti" aria-hidden="true">
        <span
          v-for="(piece, index) in confetti"
          :key="index"
          class="celebration-piece"
          :style="{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
          }"
        />
      </div>
      <v-card class="celebration-card">
        <div class="celebration-trophy">
          <v-icon icon="mdi-trophy-outline" size="48" color="#111827" />
        </div>
        <h1 class="type-h1">{{ t('goals.congrats') }}</h1>
        <p class="type-body celebration-message">{{ message }}</p>
        <v-btn
          color="primary"
          variant="flat"
          block
          data-testid="celebration-continue"
          @click="emit('close')"
        >
          {{ t('goals.continue') }}
        </v-btn>
      </v-card>
    </div>
  </v-dialog>
</template>

<style scoped>
.celebration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  padding: 24px;
  background: #f8fafc;
  overflow: hidden;
}

.celebration-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  padding: 32px 24px;
  text-align: center;
}

.celebration-trophy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: #22c55e;
}

.celebration-message {
  color: #111827;
}

.celebration-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.celebration-piece {
  position: absolute;
  top: -24px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0.8;
  animation: celebrate-fall 2.4s linear infinite;
}

@keyframes celebrate-fall {
  from {
    transform: translateY(-10px) rotate(0deg);
  }
  to {
    transform: translateY(100vh) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebration-piece {
    animation: none;
    top: 40px;
  }
}
</style>
