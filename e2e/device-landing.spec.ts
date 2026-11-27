import { devices, expect, test, type Page } from '@playwright/test'
import { registerAndSignIn } from './conta-helpers'

async function dispatchInstallPrompt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    event.prompt = () => Promise.resolve()
    event.userChoice = Promise.resolve({ outcome: 'accepted' as const })
    window.dispatchEvent(event)
  })
}

async function registrations(page: Page): Promise<number> {
  return page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
}

async function localDatabases(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await indexedDB.databases()).map((item) => item.name ?? ''))
}

test.describe('desktop recebe a landing (RN-13/RF-65 a RF-70)', () => {
  test('bloqueia rotas internas e não registra service worker nem IndexedDB', async ({ page }) => {
    const apiCalls: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/auth') || request.url().includes('/api/v1/sync')) {
        apiCalls.push(request.url())
      }
    })

    await page.goto('/')
    await expect(page.getByTestId('landing-restriction')).toBeVisible()
    await expect(page.getByTestId('landing-qr')).toBeVisible()
    await expect(page.getByTestId('landing-address')).toBeVisible()
    await expect(page.getByTestId('landing-social')).toBeVisible()
    await expect(page.getByTestId('landing-stats')).toBeVisible()
    await expect(page.getByText('O que o app oferece')).toBeVisible()
    expect(await registrations(page)).toBe(0)
    expect(await localDatabases(page)).not.toContain('emagreser')

    await page.goto('/configuracoes')
    await expect(page.getByTestId('landing-restriction')).toBeVisible()

    await page.goto('/redefinir-senha')
    await expect(page.getByTestId('landing-reset-hint')).toBeVisible()

    await page.goto('/privacidade')
    await expect(page.getByTestId('privacy-version')).toBeVisible()
    expect(apiCalls).toEqual([])
  })
})

test('celular carrega o app direto e registra o service worker (RN-11/RN-12)', async ({
  browser,
}) => {
  // Playwright usa emulação de dispositivo móvel (RN-13), sem bypass de desktop.
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await expect(page.getByTestId('landing-restriction')).toHaveCount(0)
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await expect.poll(() => registrations(page)).toBeGreaterThan(0)
  } finally {
    await context.close()
  }
})

test('convite de instalação aparece depois do onboarding e respeita 14 dias (RN-12)', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()
  try {
    await registerAndSignIn(request, page, `install-${Date.now()}@example.com`)
    // Sem beforeinstallprompt (iPhone), o aviso manual aparece só depois do onboarding.
    await expect(page.getByTestId('install-banner')).toBeVisible()
    await expect(page.getByTestId('install-action')).toHaveCount(0)

    await dispatchInstallPrompt(page)
    await expect(page.getByTestId('install-action')).toBeVisible()
    await page.getByTestId('install-dismiss').click()
    await expect(page.getByTestId('install-banner')).toHaveCount(0)

    await page.reload()
    await dispatchInstallPrompt(page)
    await expect(page.getByTestId('install-banner')).toHaveCount(0)
  } finally {
    await context.close()
  }
})
