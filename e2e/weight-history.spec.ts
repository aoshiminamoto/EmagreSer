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

/** Grava direto no IndexedDB: o objetivo é medir a lista, não repetir 1000 toques. */
async function seedWeights(page: Page, count: number): Promise<string[]> {
  return page.evaluate(async (total) => {
    const dates: string[] = []
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    for (let back = total; back >= 1; back -= 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
      dates.push(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`)
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('emagreser')
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('weightEntries', 'readwrite')
        const store = transaction.objectStore('weightEntries')
        dates.forEach((date, index) => {
          store.put({
            id: `seed-${index}`,
            date,
            weightKg: 70 + (index % 10) / 10,
            updatedAt: new Date().toISOString(),
          })
        })
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onerror = () => reject(transaction.error)
      }
      request.onerror = () => reject(request.error)
    })
    return dates
  }, count)
}

async function signInAndOnboard(page: Page, prefix: string): Promise<void> {
  const email = `${prefix}-${Date.now()}@example.com`
  await registerAccount(page.request, email)
  await signInThroughUi(page, email)
  await completeOnboardingThroughUi(page)
}

test('registrar em dois toques, validar e editar/apagar com fila de saída', async ({ page }) => {
  await signInAndOnboard(page, 'peso')
  const today = await browserToday(page)

  await page.getByTestId('register-weight').click()
  await fillField(page, 'weight-input', '10')
  await page.getByTestId('weight-save').click()
  await expect(page.getByRole('alert')).toContainText('20')

  await fillField(page, 'weight-input', '78,5')
  await page.getByTestId('weight-save').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('mood-prompt')).toBeVisible()
  await page.getByTestId('mood-skip').click()
  await expect(page.getByTestId('current-weight')).toContainText('78')

  await page.goto('/historico')
  await expect(page.getByTestId(`history-row-${today}`)).toBeVisible()
  await page.getByTestId(`history-edit-${today}`).click()
  await fillField(page, 'weight-note', 'Observação de teste')
  await fillField(page, 'weight-input', '78,2')
  await page.getByTestId('weight-save').click()
  await expect(page).toHaveURL(/\/historico$/)
  await expect(page.getByTestId('mood-prompt')).toBeVisible()
  await page.getByTestId('mood-skip').click()
  await expect(page.getByTestId(`history-row-${today}`)).toContainText('78')

  await page.getByTestId(`history-delete-${today}`).click()
  await expect(page.getByText('Apagar registro?')).toBeVisible()
  await page.getByTestId('history-delete-confirm').click()
  await expect(page.getByTestId('history-empty')).toBeVisible()

  const ops = await page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const db = request.result
          const query = db.transaction('outbox', 'readonly').objectStore('outbox').getAll()
          query.onsuccess = () => {
            db.close()
            resolve((query.result as { op: string }[]).map((item) => item.op))
          }
          query.onerror = () => reject(query.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
  expect(ops).toContain('upsert')
  expect(ops).toContain('delete')
})

test('histórico com 1000 registros renderiza poucas linhas e chega à mais antiga', async ({
  page,
}) => {
  await signInAndOnboard(page, 'historico-mil')
  const dates = await seedWeights(page, 1000)
  await page.goto('/historico')

  const rows = page.locator('[data-testid^="history-row-"]')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeLessThan(30)

  const scroller = page.locator('.v-virtual-scroll')
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(page.getByTestId(`history-row-${dates[0]}`)).toBeVisible()
})
