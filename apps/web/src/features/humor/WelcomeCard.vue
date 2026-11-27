<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  open: boolean
  message: string
}

defineProps<Props>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

function onUpdate(value: boolean): void {
  if (!value) emit('close')
}
</script>

<template>
  <v-dialog
    :model-value="open"
    max-width="420"
    persistent
    data-testid="welcome-dialog"
    @update:model-value="onUpdate"
  >
    <v-card class="welcome-card" data-testid="welcome">
      <div class="welcome-icon" aria-hidden="true">
        <v-icon icon="mdi-heart-outline" size="32" color="primary-text" />
      </div>
      <h2 class="type-h3">{{ t('welcome.title') }}</h2>
      <p class="type-body welcome-message" data-testid="welcome-message">{{ message }}</p>
      <v-btn
        color="primary"
        variant="flat"
        block
        data-testid="welcome-continue"
        @click="emit('close')"
      >
        {{ t('welcome.continue') }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.welcome-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  text-align: center;
}

.welcome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #ecfdf5;
}

.welcome-message {
  margin: 0;
  color: #111827;
}
</style>
