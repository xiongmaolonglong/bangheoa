const { test, expect } = require('@playwright/test');

const ADMIN_URL = 'http://localhost:5173';
const ADMIN_PHONE = '13800000001';
const ADMIN_PASSWORD = '123456';

test('全流程测试', async ({ page }) => {
  const issues = [];

  // ===== 1. 登录管理后台 =====
  console.log('>>> Step 1: 登录管理后台');
  await page.goto(ADMIN_URL + '/login');
  await page.waitForSelector('button:has-text("登 录")', { timeout: 10000 });
  await page.fill('input[placeholder="手机号"]', ADMIN_PHONE);
  await page.fill('input[placeholder="密码"]', ADMIN_PASSWORD);
  await page.click('button:has-text("登 录")');
  await page.waitForURL('**/dashboard', { timeout: 5000 });
  console.log('  登录成功，进入数据看板');

  // ===== 2. 检查数据看板 =====
  console.log('>>> Step 2: 检查数据看板');
  const url1 = page.url();
  if (!url1.includes('/dashboard')) {
    issues.push('登录后未跳转到 /dashboard，实际: ' + url1);
  }
  // 检查页面是否有内容
  await page.waitForTimeout(1000);
  const bodyText = await page.textContent('body');
  if (bodyText.includes('未登录')) {
    issues.push('数据看板显示未登录');
  }
  console.log('  看板URL: ' + url1);

  // ===== 3. 检查申报接收 =====
  console.log('>>> Step 3: 检查申报接收页面');
  await page.goto(ADMIN_URL + '/declarations');
  await page.waitForTimeout(1000);
  const declUrl = page.url();
  if (!declUrl.includes('/declarations')) {
    issues.push('申报接收页面路由错误');
  }
  const declBody = await page.textContent('body');
  if (declBody.includes('Network Error') || declBody.includes('401') || declBody.includes('请求失败')) {
    issues.push('申报接收页面加载失败');
  }
  console.log('  申报接收页面加载正常');

  // 检查申报列表是否有数据
  const rows = await page.locator('.el-table__body tbody tr').count();
  console.log(`  申报列表: ${rows} 条`);

  // ===== 4. 检查工单管理 =====
  console.log('>>> Step 4: 检查工单管理页面');
  await page.goto(ADMIN_URL + '/work-orders');
  await page.waitForTimeout(1500);
  const woUrl = page.url();
  if (!woUrl.includes('/work-orders')) {
    issues.push('工单管理页面路由错误');
  }
  const woBody = await page.textContent('body');
  if (woBody.includes('Network Error') || woBody.includes('401')) {
    issues.push('工单管理页面加载失败');
  }
  const woRows = await page.locator('.el-table__body tbody tr').count();
  console.log(`  工单列表: ${woRows} 条`);

  // ===== 5. 检查生产管理 =====
  console.log('>>> Step 5: 检查生产管理页面');
  await page.goto(ADMIN_URL + '/production');
  await page.waitForTimeout(1500);
  const prodUrl = page.url();
  if (!prodUrl.includes('/production')) {
    issues.push('生产管理页面路由错误');
  }
  const prodBody = await page.textContent('body');
  if (prodBody.includes('Network Error') || prodBody.includes('401')) {
    issues.push('生产管理页面加载失败');
  }
  console.log('  生产管理页面加载正常');

  // ===== 6. 检查设计管理 =====
  console.log('>>> Step 6: 检查设计管理页面');
  await page.goto(ADMIN_URL + '/designs');
  await page.waitForTimeout(1000);
  const designUrl = page.url();
  if (!designUrl.includes('/designs')) {
    issues.push('设计管理页面路由错误');
  }
  console.log('  设计管理页面加载正常');

  // ===== 7. 检查派单管理 =====
  console.log('>>> Step 7: 检查派单管理页面');
  await page.goto(ADMIN_URL + '/dispatch');
  await page.waitForTimeout(1000);
  const dispatchUrl = page.url();
  if (!dispatchUrl.includes('/dispatch')) {
    issues.push('派单管理页面路由错误');
  }
  console.log('  派单管理页面加载正常');

  // ===== 8. 检查施工管理 =====
  console.log('>>> Step 8: 检查施工管理页面');
  await page.goto(ADMIN_URL + '/construction');
  await page.waitForTimeout(1000);
  const consUrl = page.url();
  if (!consUrl.includes('/construction')) {
    issues.push('施工管理页面路由错误');
  }
  console.log('  施工管理页面加载正常');

  // ===== 9. 检查费用管理 =====
  console.log('>>> Step 9: 检查费用管理页面');
  await page.goto(ADMIN_URL + '/finance');
  await page.waitForTimeout(1000);
  const financeUrl = page.url();
  if (!financeUrl.includes('/finance')) {
    issues.push('费用管理页面路由错误');
  }
  console.log('  费用管理页面加载正常');

  // ===== 10. 检查审核中心 =====
  console.log('>>> Step 10: 检查审核中心页面');
  await page.goto(ADMIN_URL + '/audit');
  await page.waitForTimeout(1500);
  const auditUrl = page.url();
  if (!auditUrl.includes('/audit')) {
    issues.push('审核中心页面路由错误');
  }
  const auditBody = await page.textContent('body');
  if (auditBody.includes('Network Error') || auditBody.includes('401')) {
    issues.push('审核中心页面加载失败');
  }
  console.log('  审核中心页面加载正常');

  // ===== 11. 检查归档管理 =====
  console.log('>>> Step 11: 检查归档管理页面');
  await page.goto(ADMIN_URL + '/archive');
  await page.waitForTimeout(1000);
  console.log('  归档管理页面加载正常');

  // ===== 12. 检查售后管理 =====
  console.log('>>> Step 12: 检查售后管理页面');
  await page.goto(ADMIN_URL + '/aftersale');
  await page.waitForTimeout(1000);
  console.log('  售后管理页面加载正常');

  // ===== 13. 检查组织架构 =====
  console.log('>>> Step 13: 检查组织架构页面');
  await page.goto(ADMIN_URL + '/organization');
  await page.waitForTimeout(1000);
  console.log('  组织架构页面加载正常');

  // ===== 14. 检查工单详情页（随便选一条） =====
  console.log('>>> Step 14: 检查工单详情页');
  // 先在申报接收页找一条
  await page.goto(ADMIN_URL + '/declarations');
  await page.waitForTimeout(1000);
  const firstLink = await page.locator('a.wo-link').first();
  const linkCount = await firstLink.count();
  if (linkCount > 0) {
    const woId = await firstLink.getAttribute('href');
    console.log('  找到工单链接: ' + woId);
    await page.goto(ADMIN_URL + woId);
    await page.waitForTimeout(1500);
    const detailUrl = page.url();
    if (!detailUrl.includes('/work-orders/')) {
      issues.push('工单详情页路由错误: ' + detailUrl);
    }
    const detailBody = await page.textContent('body');
    if (detailBody.includes('Network Error') || detailBody.includes('401')) {
      issues.push('工单详情页加载失败');
    }
    console.log('  工单详情页加载正常');
  } else {
    console.log('  没有可访问的工单，跳过详情页测试');
  }

  // ===== 15. 检查API健康 =====
  console.log('>>> Step 15: 检查API健康');
  const apiResponse = await page.request.get('http://127.0.0.1:3000/api/v1/health');
  const apiBody = await apiResponse.json();
  if (apiBody.status !== 'ok') {
    issues.push('API健康检查失败: ' + JSON.stringify(apiBody));
  }
  console.log('  API状态: ' + apiBody.status);

  // ===== 报告 =====
  console.log('\n========== 测试报告 ==========');
  if (issues.length === 0) {
    console.log('全部通过！未发现明显问题。');
  } else {
    console.log(`发现 ${issues.length} 个问题:`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  // 写测试报告
  const fs = require('fs');
  fs.writeFileSync('tests/e2e/report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    passed: issues.length === 0,
    issues,
  }, null, 2));

  expect(issues).toHaveLength(0);
});
