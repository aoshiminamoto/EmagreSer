<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ReminderActivation from '../components/ReminderActivation.vue'
import SyncStatus from '../components/SyncStatus.vue'
import type { ProgressPhoto } from '../data/entities'
import { countOutbox } from '../data/outbox'
import { listProgressPhotos } from '../data/photos'
import { signOut } from '../features/conta/session'
import { runSync } from '../sync/engine'

const { t } = useI18n()
const router = useRouter()
const dialog = ref(false)
const pending = ref(0)
const photos = ref<ProgressPhoto[]>([])
const busy = ref(false)

async function openLogout(): Promise<void> {
  const [count, list] = await Promise.all([countOutbox(), listProgressPhotos()])
  pending.value = count
  photos.value = list
  dialog.value = true
}

async function syncBeforeLogout(): Promise<void> {
  await runSync()
  pending.value = await countOutbox()
}

function downloadPhotos(): void {
  for (const photo of photos.value) {
    const url = globalThis.URL.createObjectURL(photo.blob)
    const link = globalThis.document.createElement('a')
    const extension = photo.blob.type.split('/')[1] ?? 'jpg'
    link.href = url
    link.download = `${photo.date}-${photo.angle}.${extension}`
    link.click()
    globalThis.URL.revokeObjectURL(url)
  }
}

async function confirmLogout(): Promise<void> {
  busy.value = true
  try {
    await signOut()
    dialog.value = false
    await router.push({ name: 'login' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="more-tab">
    <h1 class="type-h1">{{ t('nav.more') }}</h1>
    <div class="sync-status-settings">
      <span class="type-caption">{{ t('sync.settingsLabel') }}</span>
      <SyncStatus detailed />
    </div>
    <ReminderActivation />
    <v-btn
      to="/configuracoes"
      data-testid="settings-link"
      color="primary-text"
      variant="text"
      prepend-icon="mdi-cog-outline"
      class="settings-link"
    >
      {{ t('settings.title') }}
    </v-btn>
    <v-btn
      to="/galeria"
      data-testid="gallery-link"
      color="primary-text"
      variant="text"
      prepend-icon="mdi-image-multiple"
      class="gallery-link"
    >
      {{ t('photo.title') }}
    </v-btn>
    <v-btn
      data-testid="logout-button"
      class="logout-button"
      variant="text"
      color="error"
      @click="openLogout"
    >
      {{ t('account.logout.action') }}
    </v-btn>

    <v-dialog v-model="dialog" max-width="440">
      <v-card class="logout-dialog">
        <h2 class="type-h3">{{ t('account.logout.title') }}</h2>
        <p class="type-body">{{ t('account.logout.body') }}</p>
        <p v-if="pending > 0" role="status" class="type-caption auth-error">
          {{ t('account.logout.pending', { count: pending }) }}
        </p>
        <p v-if="photos.length > 0" role="status" class="type-caption auth-error">
          {{ t('account.logout.photos', { count: photos.length }) }}
        </p>
        <div class="logout-actions">
          <v-btn
            v-if="pending > 0"
            data-testid="logout-sync"
            variant="text"
            color="primary-text"
            @click="syncBeforeLogout"
          >
            {{ t('account.logout.sync') }}
          </v-btn>
          <v-btn
            v-if="photos.length > 0"
            data-testid="logout-download"
            variant="text"
            color="primary-text"
            @click="downloadPhotos"
          >
            {{ t('account.logout.download') }}
          </v-btn>
          <v-btn data-testid="logout-cancel" variant="text" @click="dialog = false">
            {{ t('account.logout.cancel') }}
          </v-btn>
          <v-btn
            data-testid="logout-confirm"
            color="error"
            variant="flat"
            :loading="busy"
            @click="confirmLogout"
          >
            {{ t('account.logout.confirm') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.sync-status-settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
}

.settings-link {
  margin-top: 24px;
}

.gallery-link {
  margin-top: 8px;
}

.logout-button {
  margin-top: 8px;
}

.logout-dialog {
  padding: 24px;
}

.logout-dialog h2 {
  margin-bottom: 12px;
}

.logout-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
