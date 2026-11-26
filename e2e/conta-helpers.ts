import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const TEST_PASSWORD = 'senha-forte-123'

export async function registerAccount(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/v1/auth/register', {
    data: { email, password: TEST_PASSWORD, consent: true, displayName: 'Teste' },
  })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { accessToken: string }).accessToken
}

/** O data-testid do Vuetify fica no wrapper; o valor editável é o input interno. */
export async function fillField(page: Page, testId: string, value: string): Promise<void> {
  await page.getByTestId(testId).locator('input').fill(value)
}

export async function signInThroughUi(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await fillField(page, 'login-email', email)
  await fillField(page, 'login-password', TEST_PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/boas-vindas$/)
}

/** Conclui as cinco telas pulando o IMC e mantendo o lembrete padrão. */
export async function completeOnboardingThroughUi(page: Page): Promise<void> {
  await page.getByTestId('onboarding-next').click()
  await fillField(page, 'onboarding-weight', '80')
  await page.getByTestId('onboarding-next').click()
  await fillField(page, 'onboarding-target', '70')
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-skip').click()
  await page.getByTestId('onboarding-skip').click()
  await expect(page).toHaveURL(/\/$/)
}

export async function registerAndSignIn(
  request: APIRequestContext,
  page: Page,
  email: string,
): Promise<string> {
  const token = await registerAccount(request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)
  return token
}

/** Deixa só os três pesos que os testes de sincronização escrevem. */
export async function clearLocalWrites(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(['weightEntries', 'outbox'], 'readwrite')
          transaction.objectStore('weightEntries').clear()
          transaction.objectStore('outbox').clear()
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}
