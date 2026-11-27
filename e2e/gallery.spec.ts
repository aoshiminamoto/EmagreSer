import { expect, test, type Page } from '@playwright/test'
import { registerAndSignIn } from './conta-helpers'

interface SavedPhoto {
  width: number
  height: number
  type: string
  outbox: number
}

/** Gera um JPEG de 4000x3000 (12 MP) no próprio navegador. */
async function largeJpeg(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 4000
    canvas.height = 3000
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas indisponível')
    context.fillStyle = '#22c55e'
    context.fillRect(0, 0, 4000, 3000)
    return canvas.toDataURL('image/jpeg', 0.9)
  })
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
}

async function readSavedPhoto(page: Page): Promise<SavedPhoto> {
  return page.evaluate(
    () =>
      new Promise<SavedPhoto>((resolve, reject) => {
        const request = indexedDB.open('emagreser')
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(['progressPhotos', 'outbox'], 'readonly')
          const photos = transaction.objectStore('progressPhotos').getAll()
          const outbox = transaction.objectStore('outbox').count()
          photos.onsuccess = async () => {
            const record = photos.result[0] as { blob: Blob }
            const bitmap = await createImageBitmap(record.blob)
            const result = {
              width: bitmap.width,
              height: bitmap.height,
              type: record.blob.type,
              outbox: outbox.result,
            }
            bitmap.close()
            database.close()
            resolve(result)
          }
          photos.onerror = () => reject(photos.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}

test('galeria reduz fotos de 12 MP, funciona em avião e nunca envia imagem à rede', async ({
  context,
  page,
}) => {
  const email = `galeria-${Date.now()}@example.com`
  await registerAndSignIn(page.request, page, email)
  await page.goto('/galeria')
  await expect(page.getByTestId('photo-empty')).toBeVisible()

  // blob: é leitura local do BD; só contam requisições HTTP como rede.
  const photoRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!/^https?:\/\//.test(url)) return
    const contentType = request.headers()['content-type'] ?? ''
    if (url.includes('photo') || contentType.startsWith('image/')) {
      photoRequests.push(`${request.method()} ${url}`)
    }
  })

  await page.getByTestId('photo-add').click()
  await page.getByTestId('photo-file-gallery').setInputFiles({
    name: 'evolucao.jpg',
    mimeType: 'image/jpeg',
    buffer: await largeJpeg(page),
  })
  await expect(page.getByTestId('photo-item')).toHaveCount(1)

  const saved = await readSavedPhoto(page)
  expect(saved.width).toBe(1280)
  expect(saved.height).toBe(960)
  expect(saved.type).toBe('image/jpeg')
  expect(saved.outbox).toBe(0)
  expect(photoRequests).toEqual([])

  await context.setOffline(true)
  await page.getByTestId('photo-filter').getByText('Frente').click()
  await expect(page.getByTestId('photo-item')).toHaveCount(1)
  await page.getByTestId('photo-add').click()
  await page.getByTestId('photo-file-camera').setInputFiles({
    name: 'camera.jpg',
    mimeType: 'image/jpeg',
    buffer: await largeJpeg(page),
  })
  await expect(page.getByTestId('photo-item')).toHaveCount(2)

  await page.locator('[data-testid^="photo-compare-"]').first().click()
  await page.locator('[data-testid^="photo-compare-"]').nth(1).click()
  await page.getByTestId('photo-compare-open').click()
  await expect(page.getByTestId('photo-compare-dialog')).toBeVisible()
  await page.getByTestId('photo-compare-close').click()
  await expect(page.getByTestId('photo-compare-dialog')).toBeHidden()

  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-testid^="photo-download-"]').first().click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-front\.jpg$/)

  await page.locator('[data-testid^="photo-delete-"]').first().click()
  await expect(page.getByTestId('photo-delete-confirm')).toBeVisible()
  await page.getByTestId('photo-delete-cancel').click()
  await expect(page.getByTestId('photo-item')).toHaveCount(2)
  await page.locator('[data-testid^="photo-delete-"]').first().click()
  await page.getByTestId('photo-delete-confirm').click()
  await expect(page.getByTestId('photo-item')).toHaveCount(1)
  expect(photoRequests).toEqual([])

  await context.setOffline(false)
})
