<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSettings } from '../data/settings'
import {
  activate,
  deactivate,
  hasGrantedPermission,
  type ReminderStatus,
} from '../features/lembretes/activation'
import { currentSubscription } from '../features/lembretes/subscription'
import IosInstallNotice from './IosInstallNotice.vue'

const { t } = useI18n()
const status = ref<ReminderStatus>('off')
const busy = ref(false)

onMounted(async () => {
  const [settings, subscription] = await Promise.all([getSettings(), currentSubscription()])
  status.value =
    hasGrantedPermission() && settings?.reminderEnabled === true && subscription !== undefined
      ? 'active'
      : 'off'
})

const statusMessage = computed(() => {
  switch (status.value) {
    case 'active':
      return t('reminder.statusActive')
    case 'denied':
      return t('reminder.statusDenied')
    case 'unsupported':
      return t('reminder.statusUnsupported')
    case 'requires-install':
      return t('reminder.statusInstall')
    case 'unavailable':
      return t('reminder.statusUnavailable')
    case 'error':
      return t('reminder.statusError')
    default:
      return ''
  }
})

async function onActivate(): Promise<void> {
  busy.value = true
  try {
    status.value = await activate()
  } finally {
    busy.value = false
  }
}

async function onDeactivate(): Promise<void> {
  busy.value = true
  try {
    status.value = await deactivate()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-card class="reminder-card" variant="tonal">
    <h2 class="type-h3">{{ t('reminder.title') }}</h2>
    <p class="type-body">{{ t('reminder.body') }}</p>
    <p v-if="statusMessage" class="type-caption reminder-status" role="status">
      {{ statusMessage }}
    </p>
    <IosInstallNotice v-if="status === 'requires-install'" />
    <div class="reminder-actions">
      <v-btn
        v-if="status !== 'active'"
        data-testid="reminder-activate"
        color="primary"
        :loading="busy"
        @click="onActivate"
      >
        {{ t('reminder.activate') }}
      </v-btn>
      <v-btn
        v-else
        data-testid="reminder-deactivate"
        variant="text"
        color="error"
        :loading="busy"
        @click="onDeactivate"
      >
        {{ t('reminder.deactivate') }}
      </v-btn>
    </div>
  </v-card>
</template>

<style scoped>
.reminder-card {
  margin-top: 24px;
  padding: 16px;
}

.reminder-status {
  margin-top: 12px;
}

.reminder-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
