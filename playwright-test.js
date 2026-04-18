const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 1. 打开页面
  console.log('→ 打开管理后台...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // 2. 截图（可选）
  // await page.screenshot({ path: 'screenshot-1.png', fullPage: true });

  // 3. 填写表单（示例：登录）
  // await page.fill('input[placeholder="请输入手机号"]', '13800000001');
  // await page.fill('input[placeholder="请输入密码"]', '123456');
  // await page.click('button:has-text("登录")');
  // await page.waitForTimeout(2000);

  // 4. 点击操作
  // await page.click('text=工单管理');
  // await page.waitForTimeout(1000);

  // 5. 获取页面内容
  const title = await page.title();
  console.log('页面标题:', title);

  // 6. 检查是否有错误
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  console.log('页面错误数:', errors.length);
  if (errors.length > 0) {
    errors.forEach((e, i) => console.log(`  [${i + 1}]`, e));
  }

  // 保持浏览器打开 10 秒，方便查看
  console.log('完成，浏览器将在 10 秒后关闭...');
  await page.waitForTimeout(10000);

  await browser.close();
})();
