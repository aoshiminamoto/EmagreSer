<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarDate } from '../../data/entities'
import { putProgressPhoto } from '../../data/photos'
import { calendarDate, firstDayOfWeek } from '../peso/weight'
import { formatDate } from '../../i18n/format'
import { resizePhoto, type PhotoAngle, type PhotoChangeEvent, type PhotoFileInput } from './photo'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t, locale } = useI18n()

const angle = ref<PhotoAngle>('front')
const today = ref(calendarDate(new Date()))
const date = ref<CalendarDate>(today.value)
const dateDialog = ref(false)
const busy = ref(false)
const error = ref('')
const galleryInput = ref<PhotoFileInput>()
const cameraInput = ref<PhotoFileInput>()

const angleOptions = computed(() => [
  { value: 'front' as const, title: t('photo.angleFront') },
  { value: 'side' as const, title: t('photo.angleSide') },
  { value: 'back' as const, title: t('photo.angleBack') },
])
const dateLabel = computed(() => formatDate(date.value, locale.value))

async function onFile(event: PhotoChangeEvent): Promise<void> {
  const input = event.target as PhotoFileInput
  const file = input.files?.[0]
  input.value = ''
  if (file === undefined) return
  busy.value = true
  error.value = ''
  try {
    const blob = await resizePhoto(file)
    await putProgressPhoto({ date: date.value, angle: angle.value, blob })
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    error.value = t('photo.addError')
  } finally {
    busy.value = false
  }
}

function close(): void {
  if (busy.value) return
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="440"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="photo-add-dialog">
      <h2 class="type-h3">{{ t('photo.add') }}</h2>
      <v-select
        v-model="angle"
        data-testid="photo-angle"
        :label="t('photo.angleLabel')"
        :items="angleOptions"
        item-title="title"
        item-value="value"
        variant="outlined"
        hide-details
      />
      <v-text-field
        :model-value="dateLabel"
        data-testid="photo-date"
        :label="t('photo.dateLabel')"
        variant="outlined"
        hide-details
        readonly
        @click="dateDialog = true"
      />
      <p v-if="busy" role="status" class="type-caption photo-muted">
        {{ t('photo.processing') }}
      </p>
      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
      <div class="photo-add-actions">
        <v-btn
          data-testid="photo-from-gallery"
          color="primary"
          variant="flat"
          prepend-icon="mdi-image-outline"
          :disabled="busy"
          @click="galleryInput?.click()"
        >
          {{ t('photo.fromGallery') }}
        </v-btn>
        <v-btn
          data-testid="photo-from-camera"
          color="primary-text"
          variant="outlined"
          prepend-icon="mdi-camera-outline"
          :disabled="busy"
          @click="cameraInput?.click()"
        >
          {{ t('photo.fromCamera') }}
        </v-btn>
      </div>
      <v-btn data-testid="photo-add-close" variant="text" @click="close">
        {{ t('photo.cancel') }}
      </v-btn>
      <input
        ref="galleryInput"
        class="d-none"
        type="file"
        accept="image/*"
        data-testid="photo-file-gallery"
        @change="onFile"
      />
      <input
        ref="cameraInput"
        class="d-none"
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="photo-file-camera"
        @change="onFile"
      />
    </v-card>
    <v-dialog v-model="dateDialog" max-width="420">
      <v-card>
        <v-date-picker
          v-model="date"
          :max="today"
          :locale="locale"
          :first-day-of-week="firstDayOfWeek(locale)"
          @update:model-value="dateDialog = false"
        />
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
.photo-add-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.photo-add-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-muted {
  color: #6b7280;
}
</style>
