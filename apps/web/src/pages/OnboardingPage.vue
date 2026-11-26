<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { completeOnboarding, isValidTarget } from '../features/conta/onboarding'
import { destinationAfterSignIn } from '../features/conta/routes'
import {
  isValidTime,
  parseHeight,
  parseWeight,
  WEIGHT_STEP_OPTIONS,
} from '../features/conta/validation'

const { t } = useI18n()
const router = useRouter()
const step = ref(0)
const weightRaw = ref('')
const targetRaw = ref('')
const stepKg = ref<number>(2)
const heightRaw = ref('')
const showBmi = ref(false)
const reminderTime = ref('07:30')
const heightValue = ref<number | undefined>()
const bmiVisible = ref(false)
const error = ref('')
const busy = ref(false)

const currentWeight = computed(() => parseWeight(weightRaw.value))
const targetWeight = computed(() => parseWeight(targetRaw.value))
const stepOptions = computed(() =>
  WEIGHT_STEP_OPTIONS.map((value) => ({
    value,
    title: t('onboarding.stepOption', { count: value }),
  })),
)

function advance(): void {
  error.value = ''
  if (step.value === 1 && currentWeight.value === null) {
    error.value = t('onboarding.error.weight')
    return
  }
  if (
    step.value === 2 &&
    (targetWeight.value === null ||
      currentWeight.value === null ||
      !isValidTarget(targetWeight.value, currentWeight.value))
  ) {
    error.value = t('onboarding.error.target')
    return
  }
  step.value += 1
}

/** RF-56: Pular não grava altura nem liga o IMC. */
function skipBmi(): void {
  heightValue.value = undefined
  bmiVisible.value = false
  error.value = ''
  step.value += 1
}

function saveBmi(): void {
  const height = parseHeight(heightRaw.value)
  if (height === null) {
    error.value = t('onboarding.error.height')
    return
  }
  heightValue.value = height
  bmiVisible.value = showBmi.value
  error.value = ''
  step.value += 1
}

async function finish(): Promise<void> {
  error.value = ''
  const current = currentWeight.value
  const target = targetWeight.value
  if (current === null || target === null || !isValidTarget(target, current)) {
    error.value = t('onboarding.error.target')
    step.value = 1
    return
  }
  if (!isValidTime(reminderTime.value)) {
    error.value = t('onboarding.error.time')
    return
  }
  busy.value = true
  try {
    await completeOnboarding({
      currentWeightKg: current,
      targetWeightKg: target,
      stepKg: stepKg.value,
      ...(heightValue.value !== undefined ? { heightCm: heightValue.value } : {}),
      bmiVisible: bmiVisible.value,
      reminderTime: reminderTime.value,
    })
    await router.push({ name: await destinationAfterSignIn() })
  } catch {
    error.value = t('onboarding.error.save')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="auth-layout">
    <v-card class="auth-card onboarding-card">
      <h1 class="type-h2 auth-brand">{{ t('app.title') }}</h1>
      <p class="type-caption auth-muted">
        {{ t('onboarding.progress', { current: step + 1, total: 5 }) }}
      </p>

      <template v-if="step === 0">
        <h2 class="type-h1">{{ t('onboarding.welcome.title') }}</h2>
        <p class="type-body auth-muted">{{ t('onboarding.welcome.slogan') }}</p>
        <v-btn data-testid="onboarding-next" color="primary" variant="flat" block @click="advance">
          {{ t('onboarding.begin') }}
        </v-btn>
      </template>

      <template v-else-if="step === 1">
        <h2 class="type-h1">{{ t('onboarding.weight.title') }}</h2>
        <p class="type-body auth-muted">{{ t('onboarding.weight.body') }}</p>
        <v-text-field
          v-model="weightRaw"
          data-testid="onboarding-weight"
          :label="t('onboarding.weight.label')"
          inputmode="decimal"
          variant="outlined"
          hide-details
        />
        <v-btn data-testid="onboarding-next" color="primary" variant="flat" block @click="advance">
          {{ t('onboarding.continue') }}
        </v-btn>
      </template>

      <template v-else-if="step === 2">
        <h2 class="type-h1">{{ t('onboarding.target.title') }}</h2>
        <p class="type-body auth-muted">{{ t('onboarding.target.body') }}</p>
        <v-text-field
          v-model="targetRaw"
          data-testid="onboarding-target"
          :label="t('onboarding.target.label')"
          inputmode="decimal"
          variant="outlined"
          hide-details
        />
        <v-select
          v-model="stepKg"
          data-testid="onboarding-step"
          :label="t('onboarding.target.stepLabel')"
          :items="stepOptions"
          variant="outlined"
          hide-details
        />
        <v-btn data-testid="onboarding-next" color="primary" variant="flat" block @click="advance">
          {{ t('onboarding.continue') }}
        </v-btn>
      </template>

      <template v-else-if="step === 3">
        <h2 class="type-h1">{{ t('onboarding.bmi.title') }}</h2>
        <p class="type-body auth-muted">{{ t('onboarding.bmi.body') }}</p>
        <v-text-field
          v-model="heightRaw"
          data-testid="onboarding-height"
          :label="t('onboarding.bmi.heightLabel')"
          inputmode="numeric"
          variant="outlined"
          hide-details
        />
        <v-switch
          v-model="showBmi"
          data-testid="onboarding-bmi-switch"
          :label="t('onboarding.bmi.toggle')"
          color="primary"
          hide-details
        />
        <div class="auth-buttons">
          <v-btn data-testid="onboarding-skip" variant="text" color="primary-text" @click="skipBmi">
            {{ t('onboarding.skip') }}
          </v-btn>
          <v-btn data-testid="onboarding-save" color="primary" variant="flat" @click="saveBmi">
            {{ t('onboarding.save') }}
          </v-btn>
        </div>
      </template>

      <template v-else>
        <h2 class="type-h1">{{ t('onboarding.reminder.title') }}</h2>
        <p class="type-body auth-muted">{{ t('onboarding.reminder.body') }}</p>
        <v-text-field
          v-model="reminderTime"
          data-testid="onboarding-time"
          :label="t('onboarding.reminder.label')"
          type="time"
          variant="outlined"
          hide-details
        />
        <div class="auth-buttons">
          <v-btn data-testid="onboarding-skip" variant="text" color="primary-text" @click="finish">
            {{ t('onboarding.skip') }}
          </v-btn>
          <v-btn
            data-testid="onboarding-finish"
            color="primary"
            variant="flat"
            :loading="busy"
            @click="finish"
          >
            {{ t('onboarding.finish') }}
          </v-btn>
        </div>
      </template>

      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
    </v-card>
  </v-container>
</template>
