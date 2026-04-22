import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly statCards: Locator
  readonly orderChart: Locator
  readonly recentOrders: Locator
  readonly welcomeText: Locator

  constructor(page: Page) {
    this.page = page
    this.statCards = page.locator('.stat-card, [class*="stat"]')
    this.orderChart = page.locator('[class*="chart"], canvas')
    this.recentOrders = page.locator('.recent-orders, [class*="recent"]')
    this.welcomeText = page.locator('text=仪表盘')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async getStatCardCount(): Promise<number> {
    return await this.statCards.count()
  }
}
