import { Page, Locator } from '@playwright/test'

export class OrderPage {
  readonly page: Page
  readonly orderCards: Locator
  readonly statCards: Locator
  readonly statusTabs: Locator
  readonly searchInput: Locator
  readonly createButton: Locator
  readonly pagination: Locator

  constructor(page: Page) {
    this.page = page
    this.orderCards = page.locator('.task-card')
    this.statCards = page.locator('.stat-card')
    this.statusTabs = page.locator('.el-tabs__item, .status-tabs .el-radio-button, .stat-card')
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="订单编号"]')
    this.createButton = page.locator('text=新建订单, button:has-text("新建")')
    this.pagination = page.locator('.el-pagination')
  }

  async goto() {
    await this.page.goto('/orders')
    await this.page.waitForLoadState('networkidle')
  }

  async getCardCount(): Promise<number> {
    return await this.orderCards.count()
  }

  async clickStatusTab(tabText: string) {
    await this.page.locator(`.stat-card:has-text("${tabText}")`).first().click()
    await this.page.waitForLoadState('networkidle')
  }

  async clickFirstOrder() {
    await this.orderCards.first().click()
    await this.page.waitForLoadState('networkidle')
  }
}
