import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

test.use({ locale: 'pt-BR' })

const swPath = fileURLToPath(new URL('../apps/web/dist/sw.js', import.meta.url))

test('nova versão do build avisa e só recarrega quando a pessoa confirma', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  // Segunda versão do build: qualquer mudança de bytes no SW dispara "waiting".
  const original = readFileSync(swPath)
  writeFileSync(swPath, Buffer.concat([original, Buffer.from('\n// build de teste\n')]))
  try {
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    })

    await expect(page.getByText('Nova versão disponível')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1000)
    await expect(page.getByText('Nova versão disponível')).toBeVisible()

    await page.getByRole('button', { name: 'Atualizar' }).click()
    await expect(page.getByText('Nova versão disponível')).toBeHidden({ timeout: 20_000 })
  } finally {
    writeFileSync(swPath, original)
  }
})
