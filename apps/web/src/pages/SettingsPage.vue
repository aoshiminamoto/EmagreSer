<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LocaleSelect from '../components/LocaleSelect.vue'
import ReminderActivation from '../components/ReminderActivation.vue'
import type { Settings, WeightEntry } from '../data/entities'
import { getSettings, saveSettings, type SettingsInput } from '../data/settings'
import { listWeightEntries } from '../data/weights'
import {
  browserDeleteAccountDeps,
  browserFileDelivery,
  deleteAccount,
  deliverExport,
  fetchExport,
  isOffline,
  type ExportFormat,
} from '../features/configuracoes/account'
import { isValidTarget } from '../features/conta/onboarding'
import { isValidTime, parseHeight, WEIGHT_STEP_OPTIONS } from '../features/conta/validation'
import { apiJson, ApiError, NetworkError } from '../net/auth-client'
import { isTargetBelowHealthyRange } from '../features/peso/bmi'
import { parseDecimal, targetReferenceKg } from '../features/peso/weight'
import { formatTime } from '../i18n/format'
import { recalcAfterPull } from '../sync/recalc'

const { t, locale } = useI18n()
const router = useRouter()

const settings = ref<Settings | undefined>()
const entries = ref<WeightEntry[]>([])
const name = ref('')
const targetRaw = ref('')
const stepKg = ref<number>(2)
const waterGoalRaw = ref('')
const cupMlRaw = ref('')
const reminderTime = ref('07:30')
const reminderDays = ref<number[]>([1, 2, 3, 4, 5, 6, 7])
const heightRaw = ref('')
const showBmi = ref(false)
const message = ref('')
const error = ref('')
const busySettings = ref(false)
const busyProfile = ref(false)
const busyBmi = ref(false)
const busyExport = ref(false)

const deleteFirst = ref(false)
const deleteSecond = ref(false)
const password = ref('')
const deleteError = ref('')
const busyDelete = ref(false)
const clearBmiDialog = ref(false)

const stepOptions = computed(() =>
  WEIGHT_STEP_OPTIONS.map((value) => ({
    value,
    title: t('onboarding.stepOption', { count: value }),
  })),
)
const dayOptions = computed(() => [
  { value: 1, title: t('settings.dayMon') },
  { value: 2, title: t('settings.dayTue') },
  { value: 3, title: t('settings.dayWed') },
  { value: 4, title: t('settings.dayThu') },
  { value: 5, title: t('settings.dayFri') },
  { value: 6, title: t('settings.daySat') },
  { value: 7, title: t('settings.daySun') },
])
const hasSavedHeight = computed(() => typeof settings.value?.heightCm === 'number')
const referenceKg = computed(() => targetReferenceKg(entries.value, settings.value?.startWeightKg))
const targetWarning = computed(() => {
  const target = parseDecimal(targetRaw.value)
  const height = settings.value?.heightCm
  return target !== null && typeof height === 'number' && isTargetBelowHealthyRange(target, height)
})

interface Profile {
  displayName: string | null
}

onMounted(async () => {
  const [loadedSettings, loadedEntries] = await Promise.all([getSettings(), listWeightEntries()])
  settings.value = loadedSettings
  entries.value = loadedEntries
  if (loadedSettings !== undefined) {
    targetRaw.value =
      loadedSettings.targetWeightKg === undefined
        ? ''
        : String(loadedSettings.targetWeightKg).replace('.', ',')
    stepKg.value = loadedSettings.milestoneStepKg
    waterGoalRaw.value = String(loadedSettings.waterGoalGlasses)
    cupMlRaw.value = String(loadedSettings.waterGlassMl)
    // O servidor devolve `time` como HH:mm:ss; a interface usa HH:mm (RN-16).
    reminderTime.value = loadedSettings.reminderTime.slice(0, 5)
    reminderDays.value = [...loadedSettings.reminderDays]
    heightRaw.value = loadedSettings.heightCm === null ? '' : String(loadedSettings.heightCm ?? '')
    showBmi.value = loadedSettings.bmiVisible
  }
  try {
    const profile = await apiJson<Profile>('/api/v1/me')
    name.value = profile.displayName ?? ''
  } catch {
    // Sem rede o nome fica vazio; o restante das configurações continua local.
  }
})

/** RN-16: aceita vírgula ou ponto e valida o intervalo antes de gravar. */
function parseWhole(raw: string, min: number, max: number): number | null {
  const value = parseDecimal(raw)
  return value !== null && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function feedback(text: string): void {
  message.value = text
  error.value = ''
}

function failure(text: string): void {
  error.value = text
  message.value = ''
}

async function saveProfile(): Promise<void> {
  const trimmed = name.value.trim()
  if (trimmed.length > 80) {
    failure(t('settings.errorName'))
    return
  }
  busyProfile.value = true
  try {
    await apiJson<Profile>('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: trimmed === '' ? null : trimmed }),
    })
    feedback(t('settings.saved'))
  } catch (cause) {
    failure(cause instanceof NetworkError ? t('settings.offline') : t('settings.errorSave'))
  } finally {
    busyProfile.value = false
  }
}

async function saveChanges(): Promise<void> {
  const target = parseDecimal(targetRaw.value)
  const goal = parseWhole(waterGoalRaw.value, 1, 24)
  const cup = parseWhole(cupMlRaw.value, 50, 1000)
  if (
    target === null ||
    referenceKg.value === null ||
    !isValidTarget(target, referenceKg.value) ||
    goal === null ||
    cup === null ||
    !isValidTime(reminderTime.value) ||
    reminderDays.value.length === 0
  ) {
    failure(t('settings.errorFields'))
    return
  }
  busySettings.value = true
  try {
    const patch: SettingsInput = {
      targetWeightKg: target,
      milestoneStepKg: stepKg.value,
      waterGoalGlasses: goal,
      waterGlassMl: cup,
      reminderTime: reminderTime.value,
      reminderDays: [...reminderDays.value].sort(),
    }
    settings.value = await saveSettings(patch)
    await recalcAfterPull()
    feedback(t('settings.saved'))
  } catch {
    failure(t('settings.errorSave'))
  } finally {
    busySettings.value = false
  }
}

function toggleDay(day: number): void {
  reminderDays.value = reminderDays.value.includes(day)
    ? reminderDays.value.filter((value) => value !== day)
    : [...reminderDays.value, day].sort()
}

async function saveBmi(): Promise<void> {
  const height = heightRaw.value.trim() === '' ? undefined : parseHeight(heightRaw.value)
  if (height === undefined) {
    failure(t('bmi.heightError'))
    return
  }
  busyBmi.value = true
  try {
    settings.value = await saveSettings({ heightCm: height, bmiVisible: showBmi.value })
    feedback(t('settings.saved'))
  } catch {
    failure(t('settings.errorSave'))
  } finally {
    busyBmi.value = false
  }
}

async function clearBmi(): Promise<void> {
  busyBmi.value = true
  try {
    settings.value = await saveSettings({ heightCm: null, bmiVisible: false })
    heightRaw.value = ''
    showBmi.value = false
    clearBmiDialog.value = false
    feedback(t('settings.saved'))
  } catch {
    failure(t('settings.errorSave'))
  } finally {
    busyBmi.value = false
  }
}

async function exportData(format: ExportFormat): Promise<void> {
  if (isOffline()) {
    failure(t('settings.offline'))
    return
  }
  busyExport.value = true
  try {
    const file = await fetchExport(format)
    await deliverExport(file, browserFileDelivery())
    feedback(t('settings.exportDone'))
  } catch {
    failure(t('settings.exportError'))
  } finally {
    busyExport.value = false
  }
}

function startDelete(): void {
  deleteError.value = ''
  password.value = ''
  deleteFirst.value = true
}

function continueDelete(): void {
  deleteFirst.value = false
  deleteSecond.value = true
}

async function confirmDelete(): Promise<void> {
  if (isOffline()) {
    deleteError.value = t('settings.offline')
    return
  }
  busyDelete.value = true
  deleteError.value = ''
  try {
    await deleteAccount(browserDeleteAccountDeps(password.value))
    deleteSecond.value = false
    await router.push({ name: 'login' })
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === 'INVALID_PASSWORD') {
      deleteError.value = t('settings.deletePasswordError')
    } else if (cause instanceof NetworkError) {
      deleteError.value = t('settings.offline')
    } else {
      deleteError.value = t('settings.deleteError')
    }
  } finally {
    busyDelete.value = false
  }
}
</script>

<template>
  <v-container class="settings-layout">
    <h1 class="type-h1" data-testid="settings-title">{{ t('settings.title') }}</h1>
    <p
      v-if="message"
      class="type-caption settings-message"
      role="status"
      data-testid="settings-message"
    >
      {{ message }}
    </p>
    <p v-if="error" class="type-caption auth-error" role="alert" data-testid="settings-error">
      {{ error }}
    </p>

    <v-card class="settings-card">
      <h2 class="type-h2">{{ t('settings.profileTitle') }}</h2>
      <v-text-field
        v-model="name"
        :label="t('settings.nameLabel')"
        maxlength="80"
        data-testid="settings-name-input"
      />
      <v-btn
        color="primary"
        :loading="busyProfile"
        data-testid="settings-save-profile"
        @click="saveProfile"
      >
        {{ t('settings.saveProfile') }}
      </v-btn>
    </v-card>

    <v-card class="settings-card">
      <h2 class="type-h2">{{ t('settings.goalsTitle') }}</h2>
      <v-text-field
        v-model="targetRaw"
        :label="t('settings.targetLabel')"
        inputmode="decimal"
        data-testid="settings-target-input"
      />
      <v-select
        v-model="stepKg"
        :items="stepOptions"
        :label="t('settings.stepLabel')"
        data-testid="settings-step-input"
      />
      <div
        v-if="targetWarning"
        class="settings-warning"
        role="status"
        data-testid="settings-target-warning"
      >
        <v-icon icon="mdi-information-outline" color="text" size="20" />
        <p class="type-caption">{{ t('bmi.targetWarning') }}</p>
      </div>
      <v-text-field
        v-model="waterGoalRaw"
        :label="t('settings.waterGoalLabel')"
        inputmode="numeric"
        data-testid="settings-water-goal-input"
      />
      <v-text-field
        v-model="cupMlRaw"
        :label="t('settings.cupSizeLabel')"
        inputmode="numeric"
        data-testid="settings-cup-input"
      />
      <v-text-field
        v-model="reminderTime"
        :label="t('settings.reminderTimeLabel')"
        type="time"
        data-testid="settings-reminder-time-input"
      />
      <p class="type-caption auth-muted">{{ formatTime(reminderTime, locale) }}</p>
      <p class="type-caption auth-muted">{{ t('settings.reminderDaysLabel') }}</p>
      <div class="settings-days">
        <v-btn
          v-for="day in dayOptions"
          :key="day.value"
          :color="reminderDays.includes(day.value) ? 'primary-text' : 'text-secondary'"
          :variant="reminderDays.includes(day.value) ? 'tonal' : 'outlined'"
          size="small"
          :aria-pressed="reminderDays.includes(day.value)"
          :data-testid="`settings-reminder-day-${day.value}`"
          @click="toggleDay(day.value)"
        >
          {{ day.title }}
        </v-btn>
      </div>
      <ReminderActivation />
      <v-btn
        color="primary"
        :loading="busySettings"
        data-testid="settings-save"
        @click="saveChanges"
      >
        {{ t('settings.saveSettings') }}
      </v-btn>
    </v-card>

    <v-card class="settings-card">
      <h2 class="type-h2">{{ t('settings.languageTitle') }}</h2>
      <LocaleSelect />
    </v-card>

    <v-card class="settings-card">
      <h2 class="type-h2">{{ t('bmi.sectionTitle') }}</h2>
      <v-text-field
        v-model="heightRaw"
        :label="t('bmi.heightLabel')"
        inputmode="numeric"
        data-testid="settings-height-input"
      />
      <p v-if="!hasSavedHeight" class="type-caption auth-muted" data-testid="bmi-need-height">
        {{ t('bmi.needHeight') }}
      </p>
      <v-switch
        v-model="showBmi"
        :label="t('bmi.toggle')"
        :disabled="!hasSavedHeight"
        color="primary"
        data-testid="settings-bmi-switch"
      />
      <div class="settings-actions">
        <v-btn color="primary" :loading="busyBmi" data-testid="settings-save-bmi" @click="saveBmi">
          {{ t('settings.saveSettings') }}
        </v-btn>
        <v-btn
          v-if="hasSavedHeight"
          variant="text"
          color="error"
          data-testid="settings-clear-bmi"
          @click="clearBmiDialog = true"
        >
          {{ t('bmi.clear') }}
        </v-btn>
      </div>
    </v-card>

    <v-card class="settings-card">
      <h2 class="type-h2">{{ t('settings.privacyTitle') }}</h2>
      <v-btn
        :to="{ name: 'privacy' }"
        variant="text"
        color="primary-text"
        data-testid="settings-privacy-link"
      >
        {{ t('settings.privacyLink') }}
      </v-btn>
      <p class="type-body">{{ t('settings.exportBody') }}</p>
      <div class="settings-actions">
        <v-btn
          variant="outlined"
          color="primary-text"
          :loading="busyExport"
          data-testid="settings-export-json"
          @click="exportData('json')"
        >
          {{ t('settings.exportJson') }}
        </v-btn>
        <v-btn
          variant="outlined"
          color="primary-text"
          :loading="busyExport"
          data-testid="settings-export-csv"
          @click="exportData('csv')"
        >
          {{ t('settings.exportCsv') }}
        </v-btn>
      </div>
      <v-btn variant="text" color="error" data-testid="settings-delete-start" @click="startDelete">
        {{ t('settings.deleteTitle') }}
      </v-btn>
    </v-card>
  </v-container>

  <v-dialog v-model="clearBmiDialog" max-width="420">
    <v-card class="settings-dialog">
      <h2 class="type-h3">{{ t('bmi.clearTitle') }}</h2>
      <p class="type-body">{{ t('bmi.clearBody') }}</p>
      <div class="settings-actions">
        <v-btn variant="text" data-testid="bmi-clear-cancel" @click="clearBmiDialog = false">
          {{ t('bmi.clearCancel') }}
        </v-btn>
        <v-btn
          color="error"
          :loading="busyBmi"
          data-testid="settings-clear-bmi-confirm"
          @click="clearBmi"
        >
          {{ t('bmi.clearConfirm') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteFirst" max-width="440">
    <v-card class="settings-dialog">
      <h2 class="type-h3">{{ t('settings.deleteTitle') }}</h2>
      <p class="type-body">{{ t('settings.deleteBody') }}</p>
      <div class="settings-actions">
        <v-btn variant="text" data-testid="settings-delete-cancel" @click="deleteFirst = false">
          {{ t('settings.deleteCancel') }}
        </v-btn>
        <v-btn color="error" data-testid="settings-delete-continue" @click="continueDelete">
          {{ t('settings.deleteContinue') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteSecond" max-width="440">
    <v-card class="settings-dialog">
      <h2 class="type-h3">{{ t('settings.deleteConfirmTitle') }}</h2>
      <v-text-field
        v-model="password"
        :label="t('settings.deletePasswordLabel')"
        type="password"
        autocomplete="current-password"
        data-testid="settings-delete-password"
      />
      <p v-if="deleteError" class="type-caption auth-error" role="alert" data-testid="delete-error">
        {{ deleteError }}
      </p>
      <div class="settings-actions">
        <v-btn variant="text" data-testid="settings-delete-back" @click="deleteSecond = false">
          {{ t('settings.deleteCancel') }}
        </v-btn>
        <v-btn
          color="error"
          :loading="busyDelete"
          data-testid="settings-delete-confirm"
          @click="confirmDelete"
        >
          {{ t('settings.deleteConfirm') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.settings-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card,
.settings-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.settings-card h2,
.settings-card p {
  margin: 0;
}

.settings-message {
  padding: 12px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: #111827;
}

.settings-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #111827;
}

.settings-warning p {
  margin: 0;
}

.settings-days,
.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
