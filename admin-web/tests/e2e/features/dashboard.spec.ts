import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'

test.describe('Dashboard', () => {
  test('dashboard loads with stats after login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')

    // Dashboard should be visible
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Capture screenshot
    await page.screenshot({ path: 'artifacts/dashboard.png' })
  })

  test('top navigation bar is visible', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Check top nav exists
    await expect(page.locator('text=订单').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=设计').first()).toBeVisible({ timeout: 5000 })
  })

  test('can navigate to orders page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Click orders in top nav
    await page.locator('text=订单').first().click()
    await page.waitForLoadState('networkidle')

    // Verify URL changed
    await expect(page).toHaveURL(/\/order/)
  })
})
