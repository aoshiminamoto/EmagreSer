import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const cwd = fileURLToPath(new URL('..', import.meta.url))
const eslint = new ESLint({
  cwd,
  overrideConfigFile: fileURLToPath(new URL('../eslint.config.js', import.meta.url)),
})

describe('regra contra texto fixo em componentes', () => {
  it('falha quando um template contém texto fixo', async () => {
    const [result] = await eslint.lintText('<template><p>Hoje</p></template>', {
      filePath: 'TextoFixo.vue',
    })
    expect(result.messages.map((message) => message.ruleId)).toContain(
      '@intlify/vue-i18n/no-raw-text',
    )
  })

  it('passa quando o texto vem do catálogo', async () => {
    const source = `<script setup lang="ts">import { useI18n } from 'vue-i18n'\nconst { t } = useI18n()</script>\n<template><p>{{ t('nav.today') }}</p></template>`
    const [result] = await eslint.lintText(source, { filePath: 'TextoI18n.vue' })
    expect(result.messages.map((message) => message.ruleId)).not.toContain(
      '@intlify/vue-i18n/no-raw-text',
    )
  })
})
