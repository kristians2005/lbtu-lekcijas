import { expect, test, type Page } from '@playwright/test'

async function applyFirstTheme(page: Page, theme = 'White mode') {
  await expect(page.getByRole('heading', { name: 'Izvēlies savu iecienītāko stilu' })).toBeVisible()
  await page.getByRole('button', { name: theme, exact: true }).click()
  await page.getByRole('button', { name: 'Lietot stilu' }).click()
}

test('mobile selection, filters, language, theme, and restore', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'retro', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro')
  await page.getByRole('button', { name: 'Lietot stilu' }).click()
  await expect(page.locator('[data-theme-attention]')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lekcijas.preferences.v1') || '{}').themeIntroSeen)).toBe(true)
  await expect(page.getByRole('button', { name: 'LV', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Find your study programme/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Schedule accuracy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inženierzinātņu un informācijas tehnoloģiju fakultāte' })).toBeVisible()
  await page.getByPlaceholder('Search by name or code').fill('G0907')
  await page.getByRole('button', { name: /G0907/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose timetable options' })).toBeVisible()
  await page.getByRole('button', { name: 'Open schedule' }).click()
  await expect(page.getByRole('heading', { name: /Informācijas tehnoloģijas ilgtspējīgai attīstībai/ })).toBeVisible()
  await expect(page.getByText(/Schedule data updated/)).toBeVisible()
  await expect(page.getByText('LBTU Lekcijas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'My courses' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeHidden()
  await expect(page.getByText('Next class', { exact: true })).toHaveCount(0)
  await expect(page.locator('article[data-date]')).toHaveCount(7)
  await expect(page.getByText('No classes on this day.').first()).toBeVisible()
  await expect(page.locator('article[data-weekend="true"]')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.locator('summary[aria-label="Theme"]').click()
  const themePanel = page.locator('.dropdown-content')
  await expect(themePanel.locator('ul > li')).toHaveCount(22)
  await expect(page.getByRole('button', { name: 'silk', exact: true })).toBeVisible()
  const panelWidths = await themePanel.evaluate((element) => {
    const list = element.querySelector('ul')
    return [element.clientWidth, list?.clientWidth ?? 0]
  })
  expect(panelWidths[0] - panelWidths[1]).toBeLessThan(32)
  await page.getByRole('button', { name: 'winter', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'winter')
  await page.getByRole('button', { name: 'LV', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mainīt programmu' })).toBeVisible()

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'winter')
  await expect(page.getByRole('heading', { name: /favorite theme/i })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Informācijas tehnoloģijas ilgtspējīgai attīstībai/ })).toBeVisible()
  await page.getByRole('button', { name: 'Atjaunot' }).click()
  await expect(page.getByText(/Saraksta dati atjaunoti/)).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('desktop week view and all configured themes render', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await applyFirstTheme(page)
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByPlaceholder('Search by name or code').fill('G0903')
  await page.getByRole('button', { name: /G0903/ }).click()
  await page.getByRole('button', { name: 'Open schedule' }).click()
  await expect(page.getByRole('heading', { name: /Datorvadība un datorzinātne/ })).toBeVisible()
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('.event-card').evaluateAll((cards) => cards.every((card) => card.scrollWidth <= card.clientWidth))).toBe(true)

  for (const theme of ['light', 'dark', 'cupcake', 'synthwave', 'retro', 'valentine', 'halloween', 'garden', 'forest', 'aqua', 'lofi', 'black', 'luxury', 'dracula', 'lemonade', 'coffee', 'winter', 'dim', 'sunset', 'caramellatte', 'abyss', 'silk']) {
    await page.locator('summary[aria-label="Theme"]').click()
    await page.getByRole('button', { name: theme === 'light' ? 'White mode' : theme, exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const colors = await page.locator('body').evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.backgroundColor, style.color]
    })
    expect(colors[0]).not.toBe(colors[1])
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('G0907 alternating weeks show the correct Tuesday classes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await applyFirstTheme(page)
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByPlaceholder('Search by name or code').fill('G0907')
  await page.getByRole('button', { name: /G0907/ }).click()
  await page.getByRole('button', { name: 'Open schedule' }).click()

  await page.getByRole('button', { name: 'Tuesday, September 1, 2026' }).click()
  const firstTuesday = page.locator('[data-date="2026-09-01"] .event-card')
  await expect(firstTuesday).toHaveCount(2)
  await expect(firstTuesday).toContainText([
    'Filozofija, ētika, estētika',
    'Filozofija, ētika, estētika',
  ])
  await expect(firstTuesday).not.toContainText([
    'Programmēšanas pamati I',
    'Lietišķā saskarsme',
  ])

  await page.getByRole('button', { name: 'Next week' }).click()
  await page.getByRole('button', { name: 'Tuesday, September 8, 2026' }).click()
  const secondTuesday = page.locator('[data-date="2026-09-08"] .event-card')
  await expect(secondTuesday).toHaveCount(4)
  await expect(secondTuesday).toContainText([
    'Programmēšanas pamati I',
    'Lietišķā saskarsme',
    'Lietišķā saskarsme',
    'Programmēšanas pamati I',
  ])
})
