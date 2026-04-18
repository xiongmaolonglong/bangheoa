const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage();

  // 1. 登录
  console.log('1. 登录...');
  await page.goto('http://localhost:3001/login', { timeout: 10000, waitUntil: 'networkidle' });
  await page.getByPlaceholder('手机号').fill('18973046891');
  await page.getByPlaceholder('密码').fill('123456');
  await page.getByRole('button', { name: '登 录' }).click();
  await page.waitForTimeout(3000);
  console.log('   登录成功');

  // 2. 进入新建申报
  console.log('2. 进入新建申报...');
  await page.goto('http://localhost:3001/new-declaration', { timeout: 10000, waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // 3. 填写表单
  console.log('3. 填写表单...');
  await page.locator('.el-form-item:has-text("店铺名字") input[type="text"]').fill('测试门店' + Date.now().toString().slice(-4));

  const addr = page.locator('.el-form-item:has-text("地址") textarea');
  if (await addr.count() > 0) await addr.fill('湖南省岳阳市岳阳楼区测试街道');

  await page.locator('.el-form-item:has-text("元素选择") .el-select').click();
  await page.waitForTimeout(500);
  await page.locator('.el-select-dropdown__item').first().click();

  const desc = page.locator('.el-form-item:has-text("需求描述") textarea');
  if (await desc.count() > 0) await desc.fill('测试申报');

  // 上传照片
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    page.locator('.el-form-item:has-text("店铺照片") .el-upload--picture-card').click(),
  ]);
  await fileChooser.setFiles('test-photo.jpg');
  await page.waitForTimeout(3000);
  console.log('   表单已填完');

  // 4. 提交申报
  console.log('4. 提交申报...');
  let postStatus = null;
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/declarations') && response.request().method() === 'POST') {
      postStatus = response.status();
      try {
        const body = await response.json();
        console.log(`   [${postStatus}]`, JSON.stringify(body).substring(0, 300));
      } catch {}
    }
  });

  await page.getByRole('button', { name: '提交申报' }).click();
  await page.waitForTimeout(5000);

  const msgs = await page.locator('.el-message').allTextContents();
  console.log('   提示:', msgs);
  console.log('   URL:', page.url());
  console.log('   POST 状态:', postStatus || '未发送');

  if (postStatus === 201 || page.url().includes('my-declarations')) {
    console.log('SUCCESS: 申报提交成功!');
  } else {
    await page.screenshot({ path: 'submit-result.png', fullPage: true });
    console.log('可能失败，查看截图 submit-result.png');
  }

  await browser.close();
  console.log('测试完成');
})();
