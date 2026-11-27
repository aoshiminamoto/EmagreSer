<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Mood } from '../../data/entities'
import { setWeightMood } from '../../data/weights'
import { nextWelcomeMessage } from './messages'
import { dismissPostSaveStep, queuedSteps } from './queue'
import MoodPrompt from './MoodPrompt.vue'
import WelcomeCard from './WelcomeCard.vue'

interface Props {
  /** A celebração da Fase 5 tem prioridade sobre estes cartões. */
  blocked: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()
const step = computed(() => (props.blocked ? null : (queuedSteps.value[0] ?? null)))
const welcomeText = ref('')
let rendered: object | null = null

watch(
  step,
  async (current) => {
    if (current === null || current === rendered) return
    rendered = current
    if (current.kind === 'welcome') welcomeText.value = await nextWelcomeMessage(t)
  },
  { immediate: true },
)

async function choose(mood: Mood): Promise<void> {
  const current = step.value
  if (current?.kind !== 'mood') return
  await setWeightMood(current.entry.id, mood)
  close()
}

function close(): void {
  welcomeText.value = ''
  dismissPostSaveStep()
}
</script>

<template>
  <WelcomeCard :open="step?.kind === 'welcome'" :message="welcomeText" @close="close" />
  <MoodPrompt :open="step?.kind === 'mood'" @choose="choose" @skip="close" />
</template>
