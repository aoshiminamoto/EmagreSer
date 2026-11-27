<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Milestone, Settings, WeightEntry } from '../data/entities'
import { listMilestones } from '../data/milestones'
import { getSettings, saveSettings } from '../data/settings'
import { listWeightEntries } from '../data/weights'
import { isValidTarget } from '../features/conta/onboarding'
import { parseWeight, WEIGHT_STEP_OPTIONS } from '../features/conta/validation'
import { isTargetBelowHealthyRange } from '../features/peso/bmi'
import { nextPendingMilestone, progressPercent } from '../features/metas/milestones'
import { latestWeight } from '../features/peso/weight'
import { formatDate, formatNumber } from '../i18n/format'
import { recalcAfterPull } from '../sync/recalc'

interface GoalRow {
  milestoneKg: number
  label: string
  statusLabel: string
  achieved: boolean
}

const { t, locale } = useI18n()
const settings = ref<Settings | undefined>()
const entries = ref<WeightEntry[]>([])
const milestones = ref<Milestone[]>([])
const editing = ref(false)
const targetRaw = ref('')
const stepKg = ref<number>(2)
const error = ref('')
const busy = ref(false)

const stepOptions = computed(() =>
  WEIGHT_STEP_OPTIONS.map((value) => ({
    value,
    title: t('onboarding.stepOption', { count: value }),
  })),
)
const referenceKg = computed(
  () => settings.value?.startWeightKg ?? latestWeight(entries.value)?.weightKg ?? null,
)
const currentKg = computed(() => latestWeight(entries.value)?.weightKg ?? null)
/** RN-10: aviso sem bloquear e sem revelar o número do IMC. */
const targetWarning = computed(() => {
  const target = parseWeight(targetRaw.value)
  const height = settings.value?.heightCm
  return target !== null && typeof height === 'number' && isTargetBelowHealthyRange(target, height)
})
const progress = computed(() => {
  const config = settings.value
  if (
    config?.startWeightKg === undefined ||
    config.targetWeightKg === undefined ||
    currentKg.value === null
  ) {
    return 0
  }
  return progressPercent(config.startWeightKg, currentKg.value, config.targetWeightKg)
})
const next = computed(() =>
  currentKg.value === null ? undefined : nextPendingMilestone(milestones.value, currentKg.value),
)
const targetLabel = computed(() =>
  settings.value?.targetWeightKg === undefined
    ? t('chart.noData')
    : formatNumber(settings.value.targetWeightKg, locale.value, 'weight'),
)
const rows = computed<GoalRow[]>(() =>
  [...milestones.value]
    .sort((a, b) => b.milestoneKg - a.milestoneKg)
    .map((milestone) => {
      const achievedDate = milestone.achievedDate
      return {
        milestoneKg: milestone.milestoneKg,
        label: formatNumber(milestone.milestoneKg, locale.value, 'weight'),
        statusLabel:
          achievedDate === undefined
            ? t('goals.pending')
            : t('goals.achievedOn', { date: formatDate(achievedDate, locale.value, 'long') }),
        achieved: achievedDate !== undefined,
      }
    }),
)

onMounted(() => void load())

async function load(): Promise<void> {
  const [loadedSettings, loadedEntries, loadedMilestones] = await Promise.all([
    getSettings(),
    listWeightEntries(),
    listMilestones(),
  ])
  settings.value = loadedSettings
  entries.value = loadedEntries
  milestones.value = loadedMilestones
}

function openEdit(): void {
  error.value = ''
  const target = settings.value?.targetWeightKg
  targetRaw.value = target === undefined ? '' : formatNumber(target, locale.value, 'decimal')
  stepKg.value = settings.value?.milestoneStepKg ?? 2
  editing.value = true
}

/** RF-16: salvar meta ou passo recalcula os marcos preservando os conquistados. */
async function saveEdit(): Promise<void> {
  error.value = ''
  const target = parseWeight(targetRaw.value)
  if (target === null || referenceKg.value === null || !isValidTarget(target, referenceKg.value)) {
    error.value = t('goals.errorTarget')
    return
  }
  busy.value = true
  try {
    await saveSettings({ targetWeightKg: target, milestoneStepKg: stepKg.value })
    await recalcAfterPull()
    editing.value = false
    await load()
  } catch {
    error.value = t('goals.errorSave')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="goals-layout">
    <h1 class="type-h1">{{ t('nav.goals') }}</h1>
    <v-card class="goal-card">
      <div class="goal-heading">
        <v-progress-circular :model-value="progress" :size="80" :width="8" color="primary">
          {{ formatNumber(progress / 100, locale, 'percent') }}
        </v-progress-circular>
        <div>
          <p class="type-caption auth-muted">{{ t('goals.target') }}</p>
          <p class="type-h3" data-testid="goal-target">{{ targetLabel }}</p>
          <p v-if="next" class="type-caption auth-muted">{{ t('goals.nextStep') }}</p>
        </div>
      </div>
      <v-btn variant="outlined" color="primary-text" data-testid="goals-edit" @click="openEdit">
        {{ t('goals.edit') }}
      </v-btn>
    </v-card>

    <h2 class="type-h2">{{ t('goals.milestones') }}</h2>
    <p v-if="rows.length === 0" class="type-body auth-muted" data-testid="goals-empty">
      {{ t('goals.empty') }}
    </p>
    <v-card v-else class="milestone-list">
      <div
        v-for="row in rows"
        :key="row.milestoneKg"
        class="milestone-row"
        :data-testid="`goal-row-${row.milestoneKg}`"
      >
        <v-icon
          :icon="row.achieved ? 'mdi-check-circle-outline' : 'mdi-circle-outline'"
          :color="row.achieved ? 'primary-text' : 'text-secondary'"
        />
        <div class="milestone-info">
          <p class="type-body">{{ row.label }}</p>
          <p class="type-caption auth-muted">{{ row.statusLabel }}</p>
        </div>
      </div>
    </v-card>
  </v-container>

  <v-dialog v-model="editing" max-width="420">
    <v-card class="goal-dialog">
      <h2 class="type-h3">{{ t('goals.editTitle') }}</h2>
      <v-text-field
        v-model="targetRaw"
        :label="t('goals.targetLabel')"
        inputmode="decimal"
        data-testid="goal-target-input"
      />
      <v-select
        v-model="stepKg"
        :items="stepOptions"
        :label="t('goals.stepLabel')"
        data-testid="goal-step-input"
      />
      <div
        v-if="targetWarning"
        class="goal-warning"
        role="status"
        data-testid="goal-target-warning"
      >
        <v-icon icon="mdi-information-outline" color="text" size="20" />
        <p class="type-caption">{{ t('bmi.targetWarning') }}</p>
      </div>
      <p v-if="error" class="type-caption auth-error" data-testid="goal-error">{{ error }}</p>
      <div class="goal-dialog-actions">
        <v-btn variant="text" data-testid="goal-cancel" @click="editing = false">
          {{ t('goals.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="busy"
          data-testid="goal-save"
          @click="saveEdit"
        >
          {{ t('goals.save') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.goals-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.goal-card,
.goal-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.goal-heading {
  display: flex;
  align-items: center;
  gap: 20px;
}

.goal-heading p {
  margin: 0;
}

.milestone-list {
  padding: 8px 16px;
}

.milestone-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  border-bottom: 1px solid #e5e7eb;
}

.milestone-row:last-child {
  border-bottom: none;
}

.milestone-info p {
  margin: 0;
}

.goal-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #111827;
}

.goal-warning p {
  margin: 0;
}

.goal-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
