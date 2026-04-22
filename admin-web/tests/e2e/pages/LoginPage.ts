import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.locator('.el-form-item').first().locator('input')
    this.passwordInput = page.locator('input[type="password"]')
    this.loginButton = page.locator('.login-btn')
    this.errorMessage = page.locator('.el-message--error')
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}
