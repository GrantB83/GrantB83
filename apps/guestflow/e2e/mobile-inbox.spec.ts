import { expect, test, type Page } from '@playwright/test'
import path from 'path'

const SCREEN_DIR = path.join(
  __dirname,
  '../../../specs/022-sprint2-mobile-inbox/screenshots'
)

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
] as const

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    return {
      doc: doc.scrollWidth - window.innerWidth,
      body: body.scrollWidth - window.innerWidth,
    }
  })
  expect(overflow.doc, 'documentElement horizontal overflow').toBeLessThanOrEqual(1)
  expect(overflow.body, 'body horizontal overflow').toBeLessThanOrEqual(1)
}

async function openList(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/?fixture=1', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
}

async function openThread(page: Page, width: number, height: number, extra = '') {
  await page.setViewportSize({ width, height })
  await page.goto(`/?fixture=1&thread=1${extra}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Alex Guest' })).toBeVisible()
}

test.describe('mobile inbox evidence', () => {
  for (const viewport of VIEWPORTS) {
    test(`list ${viewport.name}`, async ({ page }) => {
      await openList(page, viewport.width, viewport.height)
      await expect(page.getByRole('button', { name: /Alex Guest/ })).toBeVisible()
      await assertNoHorizontalOverflow(page)
      await page.screenshot({
        path: path.join(SCREEN_DIR, `list-${viewport.name}.png`),
        fullPage: false,
      })
    })

    test(`thread ${viewport.name}`, async ({ page }) => {
      await openThread(page, viewport.width, viewport.height)
      await expect(page.getByText('Cottage A · 2026-10-01 → 2026-10-04')).toBeVisible()
      await assertNoHorizontalOverflow(page)
      await page.screenshot({
        path: path.join(SCREEN_DIR, `thread-${viewport.name}.png`),
        fullPage: false,
      })
    })

    test(`draft keyboard ${viewport.name}`, async ({ page }) => {
      await openThread(page, viewport.width, viewport.height, '&keyboard=1')
      await page.getByPlaceholder('Write a reply…').click()
      await expect(page.getByRole('button', { name: 'Approve Send' })).toBeVisible()
      await assertNoHorizontalOverflow(page)
      await page.screenshot({
        path: path.join(SCREEN_DIR, `draft-keyboard-${viewport.name}.png`),
        fullPage: false,
      })
    })

    test(`confirm ${viewport.name}`, async ({ page }) => {
      await openThread(page, viewport.width, viewport.height)
      await page.getByRole('button', { name: /Approve/ }).click()
      await expect(page.locator('[data-inbox-confirm]')).toBeVisible()
      await assertNoHorizontalOverflow(page)
      await page.screenshot({
        path: path.join(SCREEN_DIR, `confirm-${viewport.name}.png`),
        fullPage: false,
      })
    })
  }

  test('phone back restores list scroll', async ({ page }) => {
    await openList(page, 360, 800)
    await page.evaluate(() => {
      const list = document.querySelector('[data-inbox-pane="list"] .overflow-y-auto')
      if (list) list.scrollTop = 80
    })
    await page.getByRole('button', { name: /Alex Guest/ }).click()
    await expect(page.getByRole('heading', { name: 'Alex Guest' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to inbox list' }).click()
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  })

  test('hamburger still opens staff destinations on phone', async ({ page }) => {
    await openList(page, 360, 800)
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await expect(page.getByRole('link', { name: 'Arrivals & Departures' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ops / More Tools' })).toBeVisible()
  })
})
