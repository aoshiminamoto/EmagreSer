<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { isOnboardingDone } from '../features/conta/onboarding'
import { isMobileFlow } from '../features/device/detection'
import {
  dismissInstallPrompt,
  dismissedRecently,
  getInstallDismissedAt,
  getInstallPrompt,
  isInstalled,
  onInstallStateChange,
  promptInstall,
} from '../features/device/install'

/** Nunca durante cadastro/onboarding, nem sobre a tela de registro de peso. */
const BLOCKED_ROUTES = new Set([
  'login',
  'register',
  'forgotPassword',
  'resetPassword',
  'onboarding',
  'weightEntry',
])

const { t } = useI18n()
const route = useRoute()
const visible = ref(false)
const manual = ref(false)
let stopListening: (() => void) | undefined

async function evaluate(): Promise<void> {
  if (!isMobileFlow() || isInstalled() || BLOCKED_ROUTES.has(String(route.name ?? ''))) {
    visible.value = false
    return
  }
  if (!(await isOnboardingDone())) {
    visible.value = false
    return
  }
  if (dismissedRecently(await getInstallDismissedAt())) {
    visible.value = false
    return
  }
  // Sem beforeinstallprompt (iOS Safari): aviso manual com as etapas da Tela de Início.
  manual.value = getInstallPrompt() === null
  visible.value = true
}

async function install(): Promise<void> {
  const outcome = await promptInstall()
  if (outcome === 'accepted') visible.value = false
  if (outcome === 'dismissed') {
    await dismissInstallPrompt()
    visible.value = false
  }
}

async function dismiss(): Promise<void> {
  await dismissInstallPrompt()
  visible.value = false
}

onMounted(async () => {
  stopListening = onInstallStateChange(() => void evaluate())
  await evaluate()
})
onUnmounted(() => stopListening?.())
watch(
  () => route.name,
  () => void evaluate(),
)
</script>

<template>
  <v-card
    v-if="visible"
    class="install-banner"
    color="surface-card"
    data-testid="install-banner"
    role="status"
  >
    <v-icon icon="mdi-cellphone-arrow-down" color="primary-text" size="28" aria-hidden="true" />
    <div class="install-banner-copy">
      <p class="type-h3">
        {{ manual ? t('install.manualTitle') : t('install.title') }}
      </p>
      <p class="type-body">
        {{ manual ? t('install.manualBody') : t('install.body') }}
      </p>
    </div>
    <div class="install-banner-actions">
      <v-btn v-if="!manual" color="primary" data-testid="install-action" @click="install">
        {{ t('install.action') }}
      </v-btn>
      <v-btn variant="text" color="primary-text" data-testid="install-dismiss" @click="dismiss">
        {{ t('install.dismiss') }}
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.install-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 12px 16px 0;
  padding: 16px;
  border: 1px solid #d1fae5;
}

.install-banner-copy {
  flex: 1;
}

.install-banner-copy p {
  margin: 0;
}

.install-banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
