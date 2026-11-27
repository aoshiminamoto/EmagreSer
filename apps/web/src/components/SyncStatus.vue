<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSyncState } from '../sync/status'

withDefaults(defineProps<{ detailed?: boolean }>(), { detailed: false })

const { t } = useI18n()
const state = useSyncState()

const label = computed(() => {
  switch (state.value.status) {
    case 'synced':
      return t('sync.synced')
    case 'pending':
      return t('sync.pending')
    case 'offline':
      return t('sync.offline')
    default:
      return t('sync.offline')
  }
})
</script>

<template>
  <div
    class="sync-status"
    :class="`sync-status--${state.status}`"
    role="status"
    aria-live="polite"
    data-testid="sync-status"
  >
    <span class="sync-status__dot" aria-hidden="true" />
    <span>{{ label }}</span>
    <span v-if="state.downloaded > 0" class="sync-status__progress">
      {{ t('sync.downloading', { count: state.downloaded }) }}
    </span>
    <span v-if="detailed && state.authRequired" class="sync-status__auth">
      {{ t('sync.authRequired') }}
    </span>
  </div>
</template>

<style scoped>
.sync-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 14px;
  line-height: 20px;
}

.sync-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.sync-status--synced {
  color: #15803d;
}

.sync-status__progress,
.sync-status__auth {
  color: #6b7280;
}
</style>
