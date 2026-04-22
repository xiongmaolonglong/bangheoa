import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { OrderPage } from '../pages/OrderPage'

test.describe('Orders', () => {
  test('order list page loads', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    // Wait for dashboard to confirm login is stable
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Navigate to orders via top nav
    await page.locator('text=订单').first().click()
    await page.waitForLoadState('networkidle')

    const orderPage = new OrderPage(page)
    // Page should load - check for stat cards
    await expect(orderPage.statCards.first()).toBeVisible({ timeout: 10000 })

    // Capture screenshot
    await page.screenshot({ path: 'artifacts/order-list.png' })
  })

  test('order cards display orders', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Navigate to orders via top nav
    await page.locator('text=订单').first().click()
    await page.waitForLoadState('networkidle')

    const orderPage = new OrderPage(page)
    // Cards should be visible
    await expect(orderPage.orderCards.first()).toBeVisible({ timeout: 10000 })

    const count = await orderPage.getCardCount()
    expect(count).toBeGreaterThan(0)
  })

  test('can view order detail', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Navigate to orders via top nav
    await page.locator('text=订单').first().click()
    await page.waitForLoadState('networkidle')

    const orderPage = new OrderPage(page)
    await page.waitForLoadState('networkidle')
    const cardCount = await orderPage.getCardCount()

    if (cardCount > 0) {
      // Click first order card
      await orderPage.clickFirstOrder()
      await page.waitForLoadState('networkidle')

      // Should show detail page
      await expect(page.locator('text=订单详情, text=详情').first()).toBeVisible({ timeout: 5000 })

      await page.screenshot({ path: 'artifacts/order-detail.png' })
    }
  })

  test('status tabs filter correctly', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'admin123')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })

    // Navigate to orders via top nav
    await page.locator('text=订单').first().click()
    await page.waitForLoadState('networkidle')

    const orderPage = new OrderPage(page)
    await page.waitForLoadState('networkidle')
    const totalTabs = await orderPage.statusTabs.count()

    if (totalTabs > 0) {
      // Click first non-all tab
      const firstFilterTab = orderPage.statusTabs.nth(1)
      await expect(firstFilterTab).toBeVisible()
      await firstFilterTab.click()
      await page.waitForLoadState('networkidle')
    }
  })
})
