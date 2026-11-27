import { expect, test } from '@playwright/test'
import { fillField, registerAndSignIn, TEST_PASSWORD } from './conta-helpers'

async function bmiState(
  page: import('@playwright/test').Page,
): Promise<{ visible: boolean; height: number | null }> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const all = database
            .transaction(['settings'], 'readonly')
            .objectStore('settings')
            .getAll()
          all.onsuccess = () => {
            database.close()
            const row = all.result[0] as { bmiVisible?: boolean; heightCm?: number | null }
            resolve({ visible: row?.bmiVisible === true, height: row?.heightCm ?? null })
          }
          all.onerror = () => reject(all.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}

test('configurações sincronizam IMC, idioma, exportação e exclusão', async ({
  page,
  request,
  browser,
}) => {
  const email = `config-${Date.now()}@example.com`
  await registerAndSignIn(request, page, email)

  // RF-58/RF-59: sem altura informada, nenhuma tela mostra IMC.
  await page.goto('/evolucao')
  await expect(page.getByTestId('chart-period')).toBeVisible()
  await expect(page.getByTestId('bmi-card')).toHaveCount(0)

  await page.goto('/configuracoes')
  await expect(page.getByTestId('settings-title')).toBeVisible()
  // Flags de idioma desligadas: o seletor não aparece.
  await expect(page.getByTestId('locale-select')).toHaveCount(0)
  await expect(page.getByTestId('settings-bmi-switch').locator('input')).toBeDisabled()

  await fillField(page, 'settings-height-input', '170')
  await page.getByTestId('settings-save-bmi').click()
  await expect(page.getByTestId('settings-message')).toBeVisible()
  await page.getByTestId('settings-bmi-switch').getByText('Mostrar IMC').click()
  await page.getByTestId('settings-save-bmi').click()
  await expect.poll(async () => (await bmiState(page)).visible).toBe(true)

  // RF-60/RF-61: cartão na Evolução, com faixa, nota neutra e olho para ocultar.
  await page.goto('/evolucao')
  await expect(page.getByTestId('bmi-card')).toBeVisible()
  await expect(page.getByTestId('bmi-value')).toHaveText('27,7')
  await expect(page.getByTestId('bmi-category')).toHaveText('Sobrepeso')
  await expect(page.getByTestId('bmi-note')).toContainText('não considera massa muscular')
  await page.getByTestId('bmi-hide').click()
  await expect(page.getByTestId('bmi-card')).toHaveCount(0)

  // RF-62: apagar os dados limpa a altura desliga o interruptor.
  await page.goto('/configuracoes')
  await page.getByTestId('settings-clear-bmi').click()
  await page.getByTestId('settings-clear-bmi-confirm').click()
  await expect.poll(async () => (await bmiState(page)).height).toBeNull()
  await expect(page.getByTestId('settings-bmi-switch').locator('input')).toBeDisabled()
  await expect(page.getByTestId('settings-height-input').locator('input')).toHaveValue('')

  // RF-44: exportação em JSON pelo navegador.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('settings-export-json').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.json$/)

  // RF-45: dupla confirmação, senha e limpeza do aparelho.
  await page.getByTestId('settings-delete-start').click()
  await page.getByTestId('settings-delete-continue').click()
  await fillField(page, 'settings-delete-password', 'senha-errada')
  await page.getByTestId('settings-delete-confirm').click()
  await expect(page.getByTestId('delete-error')).toBeVisible()
  await fillField(page, 'settings-delete-password', TEST_PASSWORD)
  await page.getByTestId('settings-delete-confirm').click()
  await expect(page).toHaveURL(/\/login$/)
  const remaining = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(['settings'], 'readonly')
          const count = transaction.objectStore('settings').count()
          count.onsuccess = () => {
            database.close()
            resolve(count.result)
          }
          count.onerror = () => reject(count.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
  expect(remaining).toBe(0)

  // RF-43: página pública, sem login, com versão e aviso profissional.
  const context = await browser.newContext()
  const publicPage = await context.newPage()
  await publicPage.goto('/privacidade')
  await expect(publicPage.getByTestId('privacy-version')).toContainText('Versão do app:')
  await expect(publicPage.getByTestId('privacy-disclaimer')).toContainText(
    'não substitui o acompanhamento',
  )
  await context.close()
})
