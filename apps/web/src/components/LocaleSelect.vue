<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { availableLocales, changeLocale } from '../features/conta/locale'
import { i18n, type Locale } from '../i18n'

const { t } = useI18n()
const locales = ref<Locale[]>([])
// Os nomes aparecem no próprio idioma em qualquer catálogo ativo.
const names: Record<Locale, string> = {
  'pt-BR': t('locale.name.ptBR'),
  'en-US': t('locale.name.enUS'),
  'es-419': t('locale.name.es419'),
}
const current = computed(() => i18n.global.locale.value as Locale)
const items = computed(() =>
  locales.value.map((locale) => ({ value: locale, title: names[locale] })),
)

onMounted(async () => {
  locales.value = await availableLocales()
})

async function onChange(value: Locale | null): Promise<void> {
  if (value !== null) await changeLocale(value)
}
</script>

<template>
  <v-select
    v-if="items.length > 1"
    data-testid="locale-select"
    :label="t('locale.label')"
    :items="items"
    :model-value="current"
    item-title="title"
    item-value="value"
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="onChange"
  />
</template>
