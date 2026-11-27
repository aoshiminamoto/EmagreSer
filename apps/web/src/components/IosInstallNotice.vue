<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getMeta, setMeta } from '../data/meta'

const { t } = useI18n()
const visible = ref(false)

onMounted(async () => {
  visible.value = (await getMeta<boolean>('iosInstallNoticeDismissed')) !== true
})

async function dismiss(): Promise<void> {
  visible.value = false
  await setMeta('iosInstallNoticeDismissed', true)
}
</script>

<template>
  <div v-if="visible" class="ios-notice" role="status">
    <p class="type-body">{{ t('reminder.iosNotice') }}</p>
    <p class="type-caption">{{ t('reminder.iosSteps') }}</p>
    <v-btn variant="text" color="primary-text" size="small" @click="dismiss">
      {{ t('reminder.iosDismiss') }}
    </v-btn>
  </div>
</template>

<style scoped>
.ios-notice {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  margin-top: 12px;
  padding: 16px;
}

.ios-notice p {
  margin-bottom: 8px;
}
</style>
