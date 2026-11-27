<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type {
  CalendarDate,
  Habit,
  HabitLog,
  Milestone,
  Settings,
  WeightEntry,
} from '../data/entities'
import { listHabitLogsByDate } from '../data/habitLogs'
import { listHabits } from '../data/habits'
import { getMeta } from '../data/meta'
import { listMilestones } from '../data/milestones'
import { DEFAULT_SETTINGS, getSettings } from '../data/settings'
import { getWaterLog } from '../data/waterLogs'
import { listWeightEntries } from '../data/weights'
import {
  addCustomHabit,
  changeWaterGlasses,
  MAX_HABITS,
  removeCustomHabit,
  setHabitActive,
  toggleHabitLog,
} from '../features/habitos/actions'
import { HISTORY_DAYS, habitCompletionPercent } from '../features/habitos/history'
import { lightHaptic } from '../features/habitos/haptics'
import { habitLabel } from '../features/habitos/labels'
import { nextPendingMilestone, progressPercent } from '../features/metas/milestones'
import { latestWeight, roundKg } from '../features/peso/weight'
import { formatDate, formatNumber, formatRelative } from '../i18n/format'
import { recalcStreak, todayCalendar, type StreakSnapshot } from '../sync/recalc'

interface HabitRow {
  record: Habit
  id: string
  key: string
  label: string
  done: boolean
  active: boolean
  custom: boolean
}

const { t, locale } = useI18n()
const router = useRouter()
const entries = ref<WeightEntry[]>([])
const milestones = ref<Milestone[]>([])
const settings = ref<Settings | undefined>()
const habits = ref<Habit[]>([])
const habitLogs = ref<HabitLog[]>([])
const waterGlasses = ref(0)
const streak = ref<StreakSnapshot>({ current: 0, best: 0 })
const now = ref(new Date())
const busy = ref(false)
const managing = ref(false)
const newLabel = ref('')
const habitError = ref('')
const today = computed<CalendarDate>(() => todayCalendar(now.value))

const latest = computed(() => latestWeight(entries.value))
const currentKg = computed(() => latest.value?.weightKg ?? null)
const next = computed(() =>
  currentKg.value === null ? undefined : nextPendingMilestone(milestones.value, currentKg.value),
)
const remainingKg = computed(() =>
  next.value === undefined || currentKg.value === null
    ? null
    : roundKg(currentKg.value - next.value.milestoneKg),
)
const progress = computed(() => {
  const config = settings.value
  if (
    config?.startWeightKg === undefined ||
    config.targetWeightKg === undefined ||
    currentKg.value === null
  ) {
    return null
  }
  return progressPercent(config.startWeightKg, currentKg.value, config.targetWeightKg)
})
const remainingText = computed(() =>
  remainingKg.value === null
    ? ''
    : t('goals.remaining', {
        count: remainingKg.value,
        value: formatNumber(remainingKg.value, locale.value, 'weight'),
      }),
)

const rows = computed<HabitRow[]>(() =>
  habits.value.map((habit) => ({
    record: habit,
    id: habit.id,
    key: habit.key,
    label: habitLabel(t, habit),
    done: habitLogs.value.some((log) => log.habitId === habit.id && log.done),
    active: habit.active,
    custom: habit.label !== undefined,
  })),
)
const activeRows = computed(() => rows.value.filter((row) => row.active))
const habitPercent = computed(() =>
  habitCompletionPercent(
    habitLogs.value,
    activeRows.value.map((row) => row.id),
    today.value,
  ),
)
const habitHistoryText = computed(() =>
  t('habit.historyValue', {
    value: formatNumber(habitPercent.value / 100, locale.value, 'percent'),
    count: HISTORY_DAYS,
  }),
)
const waterGoal = computed(
  () => settings.value?.waterGoalGlasses ?? DEFAULT_SETTINGS.waterGoalGlasses,
)
const waterPercent = computed(() =>
  waterGoal.value > 0 ? Math.min(100, (waterGlasses.value / waterGoal.value) * 100) : 0,
)
const waterText = computed(() =>
  t('water.indicator', {
    count: waterGlasses.value,
    goal: waterGoal.value,
    unit: t('water.cup', { count: waterGoal.value }),
  }),
)
const streakText = computed(() => t('streak.days', { count: streak.value.current }))
const bestText = computed(() => t('streak.best', { count: streak.value.best }))

let dayTimer: ReturnType<typeof globalThis.setInterval> | undefined

onMounted(() => {
  void load(true)
  // RN-08: recalcula "hoje" à meia-noite sem apagar o histórico.
  dayTimer = globalThis.setInterval(() => {
    if (todayCalendar(new Date()) !== today.value) void load(true)
  }, 30_000)
})

onUnmounted(() => {
  if (dayTimer !== undefined) globalThis.clearInterval(dayTimer)
})

async function load(recalculate = false): Promise<void> {
  const current = new Date()
  const date = todayCalendar(current)
  // RN-08: ao abrir ou virar o dia, o streak é recalculado para o novo "hoje".
  if (recalculate) await recalcStreak(current)
  const [
    loadedEntries,
    loadedMilestones,
    loadedSettings,
    loadedHabits,
    loadedLogs,
    loadedWater,
    loadedStreak,
  ] = await Promise.all([
    listWeightEntries(),
    listMilestones(),
    getSettings(),
    listHabits(),
    listHabitLogsByDate(date),
    getWaterLog(date),
    getMeta<StreakSnapshot>('streak'),
  ])
  now.value = current
  entries.value = loadedEntries
  milestones.value = loadedMilestones
  settings.value = loadedSettings
  habits.value = loadedHabits
  habitLogs.value = loadedLogs
  waterGlasses.value = loadedWater?.glasses ?? 0
  streak.value = loadedStreak ?? { current: 0, best: 0 }
}

function openRegister(): void {
  void router.push({ name: 'weightEntry', query: { from: 'today' } })
}

async function onToggleHabit(id: string): Promise<void> {
  if (busy.value) return
  busy.value = true
  lightHaptic()
  try {
    await toggleHabitLog(id, today.value)
    await load()
  } finally {
    busy.value = false
  }
}

async function onWater(delta: number): Promise<void> {
  if (busy.value) return
  busy.value = true
  lightHaptic()
  try {
    await changeWaterGlasses(delta, today.value)
    await load()
  } finally {
    busy.value = false
  }
}

function openManage(): void {
  habitError.value = ''
  newLabel.value = ''
  managing.value = true
}

async function onAddHabit(): Promise<void> {
  habitError.value = ''
  if (newLabel.value.trim().length === 0) {
    habitError.value = t('habit.error')
    return
  }
  const created = await addCustomHabit(newLabel.value)
  if (created === undefined) {
    habitError.value = t('habit.max', { count: MAX_HABITS })
    return
  }
  newLabel.value = ''
  await load()
}

async function onSetActive(habit: Habit, active: boolean): Promise<void> {
  await setHabitActive(habit.id, active)
  await load()
}

async function onRemoveHabit(habit: Habit): Promise<void> {
  await removeCustomHabit(habit.id)
  await load()
}
</script>

<template>
  <v-container class="today-layout">
    <h1 class="type-h1">{{ t('nav.today') }}</h1>

    <v-card class="today-card streak-card" data-testid="streak-card">
      <div class="section-heading">
        <v-icon icon="mdi-trophy-outline" color="primary-text" size="28" />
        <div>
          <p class="type-caption auth-muted">{{ t('streak.title') }}</p>
          <p class="type-h3 streak-value" data-testid="streak-current">{{ streakText }}</p>
          <p class="type-caption auth-muted" data-testid="streak-best">{{ bestText }}</p>
        </div>
      </div>
    </v-card>

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
    <v-card v-if="progress !== null" class="today-card progress-card">
      <p class="type-caption auth-muted">{{ t('goals.progress') }}</p>
      <p class="type-body" data-testid="next-milestone-text">
        {{ next === undefined ? t('goals.reached') : remainingText }}
      </p>
      <v-progress-linear
        :model-value="progress"
        color="primary"
        rounded
        height="10"
        data-testid="goal-progress"
      />
      <p class="type-caption auth-muted">{{ formatNumber(progress / 100, locale, 'percent') }}</p>
    </v-card>
    <v-btn color="primary" variant="flat" block data-testid="register-weight" @click="openRegister">
      {{ t('weight.today.record') }}
    </v-btn>

    <v-card class="today-card" data-testid="habits-card">
      <div class="section-heading">
        <h2 class="type-h3">{{ t('habit.title') }}</h2>
        <v-btn
          variant="text"
          color="primary-text"
          size="small"
          data-testid="habits-manage"
          @click="openManage"
        >
          {{ t('habit.manage') }}
        </v-btn>
      </div>
      <p v-if="activeRows.length === 0" class="type-body auth-muted" data-testid="habits-empty">
        {{ t('habit.empty') }}
      </p>
      <v-checkbox
        v-for="row in activeRows"
        :key="row.id"
        :model-value="row.done"
        :label="row.label"
        color="primary"
        hide-details
        :disabled="busy"
        :data-testid="`habit-${row.key}`"
        @update:model-value="onToggleHabit(row.id)"
      />
    </v-card>

    <v-card class="today-card" data-testid="water-card">
      <div class="section-heading">
        <h2 class="type-h3">{{ t('water.title') }}</h2>
        <p class="type-caption" data-testid="water-indicator">{{ waterText }}</p>
      </div>
      <div class="water-body">
        <div class="water-glass" aria-hidden="true">
          <div class="water-fill" :style="{ height: `${waterPercent}%` }" />
        </div>
        <div class="water-actions">
          <v-btn
            icon="mdi-minus"
            variant="outlined"
            color="primary-text"
            :aria-label="t('water.remove')"
            :disabled="waterGlasses === 0 || busy"
            data-testid="water-minus"
            @click="onWater(-1)"
          />
          <v-btn
            icon="mdi-plus"
            color="primary"
            variant="flat"
            :aria-label="t('water.add')"
            :disabled="busy"
            data-testid="water-plus"
            @click="onWater(1)"
          />
        </div>
      </div>
    </v-card>

    <v-card class="today-card" data-testid="habit-history-card">
      <p class="type-caption auth-muted">{{ t('habit.history') }}</p>
      <p class="type-body" data-testid="habit-history">{{ habitHistoryText }}</p>
    </v-card>
  </v-container>

  <v-dialog v-model="managing" max-width="420">
    <v-card class="manage-dialog">
      <h2 class="type-h3">{{ t('habit.manage') }}</h2>
      <div v-for="habit in rows" :key="habit.id" class="manage-row">
        <v-switch
          :model-value="habit.active"
          color="primary"
          hide-details
          :data-testid="`habit-active-${habit.key}`"
          @update:model-value="(value) => onSetActive(habit.record, Boolean(value))"
        >
          <template #label>
            <span class="type-body">{{ habit.label }}</span>
          </template>
        </v-switch>
        <v-btn
          v-if="habit.custom"
          icon="mdi-delete-outline"
          variant="text"
          color="primary-text"
          size="small"
          :aria-label="t('habit.remove')"
          :data-testid="`habit-remove-${habit.id}`"
          @click="onRemoveHabit(habit.record)"
        />
      </div>
      <v-text-field
        v-model="newLabel"
        :label="t('habit.label')"
        data-testid="habit-new-label"
        @keyup.enter="onAddHabit"
      />
      <p v-if="habitError" class="type-caption auth-error" data-testid="habit-error">
        {{ habitError }}
      </p>
      <div class="manage-actions">
        <v-btn variant="text" data-testid="habit-manage-close" @click="managing = false">
          {{ t('habit.cancel') }}
        </v-btn>
        <v-btn color="primary" variant="flat" data-testid="habit-add" @click="onAddHabit">
          {{ t('habit.add') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
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

.progress-card {
  gap: 8px;
}

.progress-card p {
  margin: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading > div {
  display: flex;
  flex-direction: column;
}

.section-heading p {
  margin: 0;
}

.streak-value {
  color: #15803d;
}

.water-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 12px;
}

.water-glass {
  position: relative;
  width: 64px;
  height: 88px;
  overflow: hidden;
  border: 3px solid #d1d5db;
  border-top: none;
  border-radius: 8px 8px 16px 16px;
}

.water-fill {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: #22c55e;
  transition: height 320ms ease-out;
}

.water-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.manage-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}

.manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.manage-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
