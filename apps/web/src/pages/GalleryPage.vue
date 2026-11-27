<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AddPhotoDialog from '../features/fotos/AddPhotoDialog.vue'
import type { PhotoAngle } from '../features/fotos/photo'
import { deleteProgressPhoto, listProgressPhotos } from '../data/photos'
import type { ProgressPhoto } from '../data/entities'
import { formatDate } from '../i18n/format'

type AngleFilter = PhotoAngle | 'all'

const { t, locale } = useI18n()

const photos = ref<ProgressPhoto[]>([])
const previewUrls = ref<Record<string, string>>({})
const filter = ref<AngleFilter>('all')
const selected = ref<string[]>([])
const addOpen = ref(false)
const compareOpen = ref(false)
const deleting = ref<ProgressPhoto | undefined>()
const busy = ref(false)

const angleLabels = computed<Record<string, string>>(() => ({
  front: t('photo.angleFront'),
  side: t('photo.angleSide'),
  back: t('photo.angleBack'),
}))

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('photo.angleAll') },
  { value: 'front' as const, label: angleLabels.value.front },
  { value: 'side' as const, label: angleLabels.value.side },
  { value: 'back' as const, label: angleLabels.value.back },
])

const visible = computed(() =>
  filter.value === 'all'
    ? photos.value
    : photos.value.filter((photo) => photo.angle === filter.value),
)

const comparison = computed(() =>
  selected.value
    .map((id) => photos.value.find((photo) => photo.id === id))
    .filter((photo): photo is ProgressPhoto => photo !== undefined),
)

function labelFor(photo: ProgressPhoto): string {
  return angleLabels.value[photo.angle] ?? t('photo.angleUnknown')
}

function revokeUrls(): void {
  for (const url of Object.values(previewUrls.value)) globalThis.URL.revokeObjectURL(url)
  previewUrls.value = {}
}

async function load(): Promise<void> {
  revokeUrls()
  photos.value = await listProgressPhotos()
  const urls: Record<string, string> = {}
  for (const photo of photos.value) urls[photo.id] = globalThis.URL.createObjectURL(photo.blob)
  previewUrls.value = urls
}

onMounted(() => void load())
onUnmounted(revokeUrls)

function downloadPhoto(photo: ProgressPhoto): void {
  const url = globalThis.URL.createObjectURL(photo.blob)
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = `${photo.date}-${photo.angle}.jpg`
  link.click()
  globalThis.URL.revokeObjectURL(url)
}

function canCompare(photo: ProgressPhoto): boolean {
  if (selected.value.includes(photo.id)) return true
  const first = photos.value.find((item) => item.id === selected.value[0])
  return first === undefined || first.angle === photo.angle
}

function toggleCompare(photo: ProgressPhoto): void {
  const index = selected.value.indexOf(photo.id)
  if (index >= 0) {
    selected.value.splice(index, 1)
    return
  }
  if (!canCompare(photo)) return
  if (selected.value.length === 2) selected.value.shift()
  selected.value.push(photo.id)
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value
  if (target === undefined) return
  busy.value = true
  try {
    await deleteProgressPhoto(target.id)
    deleting.value = undefined
    selected.value = selected.value.filter((id) => id !== target.id)
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="gallery-layout">
    <h1 class="type-h1">{{ t('photo.title') }}</h1>

    <v-card class="photo-privacy" role="status">
      <v-icon icon="mdi-shield-lock-outline" color="primary-text" />
      <div>
        <h2 class="type-h3">{{ t('photo.privacyTitle') }}</h2>
        <p class="type-body">{{ t('photo.privacyNotice') }}</p>
      </div>
    </v-card>

    <div class="gallery-toolbar">
      <v-btn-toggle
        v-model="filter"
        mandatory
        color="primary"
        variant="outlined"
        divided
        density="comfortable"
        data-testid="photo-filter"
      >
        <v-btn
          v-for="option in filterOptions"
          :key="option.value"
          :value="option.value"
          size="small"
        >
          {{ option.label }}
        </v-btn>
      </v-btn-toggle>
      <v-btn
        data-testid="photo-add"
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        @click="addOpen = true"
      >
        {{ t('photo.add') }}
      </v-btn>
    </div>

    <p v-if="visible.length === 0" class="type-body photo-muted" data-testid="photo-empty">
      {{ t('photo.empty') }}
    </p>

    <div v-else class="photo-grid">
      <v-card
        v-for="photo in visible"
        :key="photo.id"
        class="photo-card"
        :class="{ 'photo-selected': selected.includes(photo.id) }"
        data-testid="photo-item"
      >
        <img
          class="photo-image"
          :src="previewUrls[photo.id]"
          :alt="
            t('photo.imageAlt', { angle: labelFor(photo), date: formatDate(photo.date, locale) })
          "
        />
        <div class="photo-info">
          <p class="type-body" data-testid="photo-date">{{ formatDate(photo.date, locale) }}</p>
          <p class="type-caption photo-muted">{{ labelFor(photo) }}</p>
        </div>
        <div class="photo-actions">
          <v-btn
            icon="mdi-download-outline"
            variant="text"
            color="primary-text"
            :aria-label="t('photo.download')"
            :data-testid="`photo-download-${photo.id}`"
            @click="downloadPhoto(photo)"
          />
          <v-btn
            icon="mdi-compare"
            variant="text"
            color="primary-text"
            :aria-label="t('photo.compare')"
            :disabled="!canCompare(photo)"
            :data-testid="`photo-compare-${photo.id}`"
            @click="toggleCompare(photo)"
          />
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            color="error"
            :aria-label="t('photo.delete')"
            :data-testid="`photo-delete-${photo.id}`"
            @click="deleting = photo"
          />
        </div>
      </v-card>
    </div>

    <div v-if="selected.length > 0" class="photo-compare-bar">
      <p v-if="selected.length === 1" class="type-caption photo-muted">
        {{ t('photo.compareSameAngle') }}
      </p>
      <v-btn variant="text" color="primary-text" @click="selected = []">
        {{ t('photo.compareClear') }}
      </v-btn>
      <v-btn
        v-if="selected.length === 2"
        data-testid="photo-compare-open"
        color="primary"
        variant="flat"
        @click="compareOpen = true"
      >
        {{ t('photo.compare') }}
      </v-btn>
    </div>

    <AddPhotoDialog v-model="addOpen" @saved="load" />

    <v-dialog v-model="compareOpen" max-width="900">
      <v-card class="photo-compare-dialog" data-testid="photo-compare-dialog">
        <h2 class="type-h3">{{ t('photo.compareTitle') }}</h2>
        <div class="photo-compare-grid">
          <figure v-for="photo in comparison" :key="photo.id" class="photo-compare-item">
            <img
              :src="previewUrls[photo.id]"
              :alt="
                t('photo.imageAlt', {
                  angle: labelFor(photo),
                  date: formatDate(photo.date, locale),
                })
              "
            />
            <figcaption class="type-caption photo-muted">
              {{ formatDate(photo.date, locale) }}
            </figcaption>
          </figure>
        </div>
        <v-btn
          data-testid="photo-compare-close"
          variant="text"
          color="primary-text"
          @click="compareOpen = false"
        >
          {{ t('photo.cancel') }}
        </v-btn>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="deleting !== undefined"
      max-width="420"
      @update:model-value="deleting = undefined"
    >
      <v-card v-if="deleting" class="photo-delete-dialog">
        <h2 class="type-h3">{{ t('photo.deleteTitle') }}</h2>
        <p class="type-body">
          {{
            t('photo.deleteBody', {
              date: formatDate(deleting.date, locale),
              angle: labelFor(deleting),
            })
          }}
        </p>
        <div class="photo-dialog-actions">
          <v-btn data-testid="photo-delete-cancel" variant="text" @click="deleting = undefined">
            {{ t('photo.deleteCancel') }}
          </v-btn>
          <v-btn
            data-testid="photo-delete-confirm"
            color="error"
            variant="flat"
            :loading="busy"
            @click="confirmDelete"
          >
            {{ t('photo.deleteConfirm') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.gallery-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.photo-privacy {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.photo-privacy p {
  margin: 4px 0 0;
  color: #6b7280;
}

.gallery-toolbar,
.photo-compare-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-compare-bar p {
  flex: 1 1 100%;
  margin: 0;
}

.photo-muted {
  color: #6b7280;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.photo-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  box-shadow:
    0 8px 24px rgba(17, 24, 39, 0.06),
    0 2px 6px rgba(17, 24, 39, 0.04);
}

.photo-selected {
  outline: 2px solid #22c55e;
}

.photo-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  background: #f8fafc;
}

.photo-info {
  padding: 8px 12px 0;
}

.photo-info p {
  margin: 0;
}

.photo-actions {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px 8px;
}

.photo-compare-dialog,
.photo-delete-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.photo-compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.photo-compare-item {
  margin: 0;
}

.photo-compare-item img {
  width: 100%;
  border-radius: 16px;
}

.photo-compare-item figcaption {
  margin-top: 8px;
  text-align: center;
}

.photo-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
