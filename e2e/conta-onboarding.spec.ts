import { expect, test, type Page } from '@playwright/test'
import {
  completeOnboardingThroughUi,
  fillField,
  registerAccount,
  signInThroughUi,
  TEST_PASSWORD,
} from './conta-helpers'

function readSettings(page: Page): Promise<Record<string, unknown> | undefined> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const store = database.transaction('settings', 'readonly').objectStore('settings')
          const query = store.getAll()
          query.onsuccess = () => {
            database.close()
            resolve(query.result[0] as Record<string, unknown> | undefined)
          }
          query.onerror = () => reject(query.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}

test('cadastro, onboarding e reabertura sem rede levam ao Hoje', async ({ page, context }) => {
  const email = `onboarding-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)

  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible()
  const settings = await readSettings(page)
  expect(settings).toMatchObject({ onboardingDone: true, bmiVisible: false })
  expect(settings?.heightCm).toBeUndefined()

  // Falha de rede na renovação do token: a marca local mantém a sessão.
  await context.route('**/api/v1/auth/refresh', (route) => route.abort())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible()
})

test('fechar no meio do onboarding recomeça do passo 1', async ({ page }) => {
  const email = `retomada-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await page.getByTestId('onboarding-next').click()
  await fillField(page, 'onboarding-weight', '81')
  await page.getByTestId('onboarding-next').click()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao EmagreSer' })).toBeVisible()
  await expect(page.getByTestId('onboarding-weight')).toHaveCount(0)
})

test('erro de login é genérico e vem do código da API', async ({ page }) => {
  await page.goto('/login')
  await fillField(page, 'login-email', `nadica-${Date.now()}@example.com`)
  await fillField(page, 'login-password', TEST_PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
})

test('recuperação responde o mesmo para e-mail inexistente', async ({ page }) => {
  await page.goto('/esqueci-a-senha')
  await fillField(page, 'forgot-email', `inexistente-${Date.now()}@example.com`)
  await page.getByTestId('forgot-submit').click()
  await expect(page.getByRole('status')).toContainText('Se o e-mail existir')
})

test('sair avisa sobre fotos e só apaga os dados após confirmar', async ({ page }) => {
  const email = `saida-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('progressPhotos', 'readwrite')
          transaction.objectStore('progressPhotos').put({
            id: 'foto-teste',
            date: '2026-11-26',
            angle: 'front',
            blob: new Blob(['foto'], { type: 'image/jpeg' }),
            createdAt: new Date().toISOString(),
          })
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )

  await page.goto('/mais')
  await page.getByTestId('logout-button').click()
  await expect(page.getByTestId('logout-download')).toBeVisible()
  await page.getByTestId('logout-cancel').click()
  expect(await readSettings(page)).toBeDefined()

  await page.getByTestId('logout-button').click()
  await page.getByTestId('logout-confirm').click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await readSettings(page)).toBeUndefined()
})
