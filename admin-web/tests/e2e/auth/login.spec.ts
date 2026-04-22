import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('admin can login successfully', async ({ page }) => {
    await loginPage.goto()

    // Verify login page elements
    await expect(loginPage.usernameInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
    await expect(page.locator('.login-title')).toContainText('户外广告派单系统')

    // Login
    await loginPage.login('admin', 'admin123')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/)
    await expect(page.locator('text=项目流水线')).toBeVisible({ timeout: 10000 })
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await loginPage.goto()

    await loginPage.login('invalid_user', 'wrong_password')

    // Wait for error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('login with empty fields shows validation', async ({ page }) => {
    await loginPage.goto()

    // Try to submit without filling
    await loginPage.loginButton.click()

    // Verify validation messages
    await expect(page.locator('text=请输入用户名')).toBeVisible({ timeout: 3000 })
  })

  test('login with empty password shows validation', async ({ page }) => {
    await loginPage.goto()

    await loginPage.usernameInput.fill('admin')
    await loginPage.loginButton.click()

    await expect(page.locator('text=请输入密码')).toBeVisible({ timeout: 3000 })
  })
})
