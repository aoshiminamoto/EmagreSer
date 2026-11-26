import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

interface WeightWrite {
  id?: string
  date: string
  weightKg: number
  updatedAt: string
}

interface PullChange {
  entity: string
  id: string
  data: Record<string, unknown>
}

async function register(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/v1/auth/register', {
    data: { email, password: 'senha-forte-123', consent: true, displayName: 'Teste' },
  })
  expect(response.ok()).toBe(true)
  return ((await response.json()) as { accessToken: string }).accessToken
}

/** Escreve peso + fila na mesma transação, exatamente como a camada local faz. */
async function writeWeight(page: Page, input: WeightWrite): Promise<void> {
  await page.evaluate((value) => {
    const open = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('emagreser')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return open.then(
      (database) =>
        new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(['weightEntries', 'outbox'], 'readwrite')
          const id = value.id ?? crypto.randomUUID()
          const record = {
            id,
            date: value.date,
            weightKg: value.weightKg,
            updatedAt: value.updatedAt,
            deleted: false,
          }
          transaction.objectStore('weightEntries').put(record)
          transaction.objectStore('outbox').add({
            entity: 'weight_entries',
            id,
            op: 'upsert',
            data: record,
            clientUpdatedAt: value.updatedAt,
          })
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onerror = () => reject(transaction.error)
        }),
    )
  }, input)
}

async function readWeight(page: Page, id: string): Promise<number | undefined> {
  return page.evaluate((key) => {
    const open = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('emagreser')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return open.then(
      (database) =>
        new Promise<number | undefined>((resolve, reject) => {
          const store = database
            .transaction('weightEntries', 'readonly')
            .objectStore('weightEntries')
          const request = store.get(key)
          request.onsuccess = () => {
            database.close()
            resolve((request.result as { weightKg?: number } | undefined)?.weightKg)
          }
          request.onerror = () => reject(request.error)
        }),
    )
  }, id)
}

async function pullWeights(request: APIRequestContext, token: string): Promise<PullChange[]> {
  const response = await request.get('/api/v1/sync/pull?cursor=0&limit=500', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { changes: PullChange[] }
  return body.changes.filter((change) => change.entity === 'weight_entries')
}

test('três pesos offline chegam ao servidor sem duplicar quando a rede volta', async ({
  context,
  page,
}) => {
  const email = `offline-${Date.now()}@example.com`
  const token = await register(page.request, email)
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('Sincronizado')

  await context.setOffline(true)
  await writeWeight(page, {
    date: '2026-11-20',
    weightKg: 71.2,
    updatedAt: '2026-11-26T12:00:00.000Z',
  })
  await writeWeight(page, {
    date: '2026-11-21',
    weightKg: 71.0,
    updatedAt: '2026-11-26T12:00:01.000Z',
  })
  await writeWeight(page, {
    date: '2026-11-22',
    weightKg: 70.8,
    updatedAt: '2026-11-26T12:00:02.000Z',
  })

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))

  await expect
    .poll(async () => (await pullWeights(page.request, token)).length, { timeout: 30_000 })
    .toBe(3)
  const weights = await pullWeights(page.request, token)
  expect(weights.map((change) => change.data.date).sort()).toEqual([
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
  ])
  await expect(page.getByRole('status')).toContainText('Sincronizado')
})

test('duas abas convergem para a escrita mais recente do mesmo registro', async ({
  context,
  page,
}) => {
  const email = `converge-${Date.now()}@example.com`
  const token = await register(page.request, email)
  await page.goto('/')
  const id = crypto.randomUUID()
  const older = '2026-11-26T13:00:00.000Z'
  const newer = '2026-11-26T13:05:00.000Z'

  await writeWeight(page, { id, date: '2026-11-23', weightKg: 69.9, updatedAt: older })
  const second = await context.newPage()
  await second.goto('/')
  await writeWeight(second, { id, date: '2026-11-23', weightKg: 69.1, updatedAt: newer })
  await second.evaluate(() => window.dispatchEvent(new Event('online')))
  await page.evaluate(() => window.dispatchEvent(new Event('online')))

  await expect
    .poll(async () => {
      const changes = await pullWeights(page.request, token)
      return changes.find((change) => change.id === id)?.data.weight_kg
    })
    .toBe(69.1)
  await expect.poll(() => readWeight(page, id)).toBe(69.1)
  await expect.poll(() => readWeight(second, id)).toBe(69.1)
  await expect(page.getByRole('status')).toContainText('Sincronizado')
})
