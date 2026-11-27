import { devices, expect, test, type Page } from '@playwright/test'

/**
 * RF-74/RF-75/RF-83: seletor de idioma, flags e layout em 360 px nos três
 * idiomas. A resposta de /flags é simulada só neste contexto: a build de
 * produção continua com i18n_en e i18n_es em off.
 */

const cases = [
  { value: 'pt-BR', name: 'Português', title: 'Que bom te ver de novo', submit: 'Entrar' },
  { value: 'en-US', name: 'English', title: 'Good to see you again', submit: 'Sign in' },
  { value: 'es-419', name: 'Español', title: 'Qué bueno verte de nuevo', submit: 'Iniciar sesión' },
] as const

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  )
}

test('idiomas em 360 px: flags off só pt-BR; flags on liberam o seletor sem cortar texto', async ({
  browser,
}) => {
  let enabled = false
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 740 },
    locale: 'en-US',
  })
  const page = await context.newPage()
  await page.route('**/api/v1/flags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        flags: { i18n_en: enabled, i18n_es: enabled },
        locales: enabled ? ['pt-BR', 'en-US', 'es-419'] : ['pt-BR'],
      }),
    })
  })

  try {
    await page.goto('/login')
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await expect(page.getByTestId('locale-select')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByTestId('login-submit')).toHaveText('Entrar')

    enabled = true
    await page.reload()
    await expect(page.getByTestId('locale-select')).toBeVisible()

    for (const item of cases) {
      await page.getByTestId('locale-select').click()
      await page.getByRole('option', { name: item.name, exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', item.value)
      await expect(page.getByRole('heading', { name: item.title })).toBeVisible()
      await expect(page.getByTestId('login-submit')).toHaveText(item.submit)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

      // Nenhum rótulo principal fica cortado na largura de 360 px.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll('.auth-card h1, .auth-card h2, [data-testid="login-submit"]')]
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => element.textContent?.trim() ?? ''),
      )
      expect(clipped).toEqual([])
    }
  } finally {
    await context.close()
  }
})
