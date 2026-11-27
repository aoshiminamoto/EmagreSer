import { expect, test, type Page } from '@playwright/test'
import {
  completeOnboardingThroughUi,
  fillField,
  registerAccount,
  signInThroughUi,
} from './conta-helpers'

async function browserToday(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  })
}

test('tendência, barra de progresso e marcos celebrados uma única vez', async ({ page }) => {
  const email = `metas-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)
  const date = await browserToday(page)

  // P=80, A=70, S=2: 75 cruza 78 e 76 de uma vez.
  await page.goto('/historico')
  await page.getByTestId(`history-edit-${date}`).click()
  await fillField(page, 'weight-input', '75')
  await page.getByTestId('weight-save').click()

  const celebration = page.getByTestId('celebration')
  await expect(celebration).toBeVisible()
  await expect(celebration).toContainText('76')
  await expect(celebration).toContainText('2')
  await page.getByTestId('celebration-continue').click()
  await expect(celebration).toBeHidden()
  await page.reload()
  await expect(celebration).toBeHidden()

  // A edição trocou o peso de hoje; um segundo dia vem direto do IndexedDB.
  await page.evaluate(() => {
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const date = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('emagreser')
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('weightEntries', 'readwrite')
        transaction.objectStore('weightEntries').put({
          id: `seed-${date}`,
          date,
          weightKg: 80,
          updatedAt: now.toISOString(),
        })
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
      request.onerror = () => reject(request.error)
    })
  })

  await page.goto('/')
  await expect(page.getByTestId('next-milestone-text')).toContainText('1')
  await page.goto('/evolucao')
  await expect(page.getByTestId('trend-chart')).toBeVisible()
  await expect(page.getByTestId('trend-point')).toHaveCount(2)
  await expect(page.getByTestId('indicator-current')).toContainText('75')
  await page.getByTestId('chart-period').getByText('90 dias').click()
  await expect(page.getByTestId('trend-chart')).toBeVisible()

  await page.goto('/metas')
  await expect(page.getByTestId('goal-row-78')).toContainText('Alcançado')
  await expect(page.getByTestId('goal-row-74')).toContainText('Pendente')
  await page.getByTestId('goals-edit').click()
  await fillField(page, 'goal-target-input', '68')
  await page.getByTestId('goal-step-input').click()
  await page.getByRole('option', { name: '5 kg' }).click()
  await page.getByTestId('goal-save').click()

  // RF-16: os conquistados ficam; os pendentes seguem o passo novo.
  await expect(page.getByTestId('goal-row-78')).toBeVisible()
  await expect(page.getByTestId('goal-row-76')).toBeVisible()
  await expect(page.getByTestId('goal-row-72')).toHaveCount(0)
  await expect(page.getByTestId('goal-row-68')).toContainText('Pendente')
})

test('a meta é validada contra o peso atual após editar o registro (RF-02/RN-02)', async ({
  page,
}) => {
  const email = `meta-subida-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)
  const date = await browserToday(page)

  // Peso inicial 80 é editado para 97: o startWeightKg continua 80.
  await page.goto('/historico')
  await page.getByTestId(`history-edit-${date}`).click()
  await fillField(page, 'weight-input', '97')
  await page.getByTestId('weight-save').click()
  await expect(page.getByTestId('mood-prompt')).toBeVisible()
  await page.getByTestId('mood-skip').click()

  // 85 < 97 deve ser aceito; falharia se comparasse com o peso inicial.
  await page.goto('/configuracoes')
  await fillField(page, 'settings-target-input', '85')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-message')).toBeVisible()
  await expect(page.getByTestId('settings-error')).toHaveCount(0)
  await expect(page.getByTestId('settings-target-input').locator('input')).toHaveValue('85')
})
