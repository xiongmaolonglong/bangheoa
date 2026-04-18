const { test, expect } = require('@playwright/test');

const ADMIN_URL = 'http://localhost:5173';
const ADMIN_PHONE = '13800000001';
const ADMIN_PASSWORD = '123456';
const API = 'http://127.0.0.1:3000/api/v1';

async function apiLogin() {
  const res = await fetch(API + '/auth/tenant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('API返回非JSON: ' + text.slice(0, 200)); }
  return data.data?.token || data.token;
}

async function apiCreateDeclaration(token) {
  const now = new Date().toLocaleString('zh-CN');
  const res = await fetch(API + '/declarations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Playwright 测试单 - ' + now,
      project_type: '和成',
      province_code: '440000',
      city_code: '440100',
      district_code: '440103',
      detail_address: '广州市荔湾区测试路88号',
      contact_name: '测试联系人',
      contact_phone: '13900000001',
      description: 'Playwright 自动化测试创建的申报单',
    }),
  });
  const text = await res.text();
  return JSON.parse(text);
}

async function apiApproveDecl(token, declId) {
  const res = await fetch(API + `/declarations/${declId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ comment: '自动审批通过' }),
  });
  return res.json();
}

async function apiGetTenantDeclarations(token) {
  const res = await fetch(API + '/tenant/declarations?page=1&limit=10', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  return JSON.parse(text);
}

async function apiGetWorkOrders(token) {
  const res = await fetch(API + '/work-orders?stage=production&page=1&limit=100', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  return JSON.parse(text);
}

async function apiGetReviewTasks(token) {
  const res = await fetch(API + '/work-orders/reviews/tasks', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  return JSON.parse(text);
}

async function apiGetProductionBatches(token) {
  const res = await fetch(API + '/production/batches?page=1&limit=20', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const text = await res.text();
  return JSON.parse(text);
}

test.describe('全流程测试', () => {

  test('页面加载 + API 数据验证', async ({ page }) => {
    const issues = [];

    // 1. 登录获取 token
    console.log('>>> 1. 获取 API Token');
    const token = await apiLogin();
    expect(token).toBeTruthy();

    // 2. 登录前端
    console.log('>>> 2. 前端登录');
    await page.goto(ADMIN_URL + '/login');
    await page.waitForSelector('button:has-text("登 录")', { timeout: 10000 });
    await page.fill('input[placeholder="手机号"]', ADMIN_PHONE);
    await page.fill('input[placeholder="密码"]', ADMIN_PASSWORD);
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // 3. 逐个页面访问并检查报错
    const pages = [
      { path: '/dashboard', name: '数据看板' },
      { path: '/work-orders', name: '工单管理' },
      { path: '/declarations', name: '申报接收' },
      { path: '/dispatch', name: '派单管理' },
      { path: '/designs', name: '设计管理' },
      { path: '/production', name: '生产管理' },
      { path: '/construction', name: '施工管理' },
      { path: '/finance', name: '费用管理' },
      { path: '/archive', name: '归档管理' },
      { path: '/aftersale', name: '售后管理' },
      { path: '/audit', name: '审核中心' },
      { path: '/organization', name: '组织架构' },
      { path: '/notifications', name: '消息通知' },
      { path: '/audit-logs', name: '操作日志' },
      { path: '/clients', name: '甲方管理' },
      { path: '/settings', name: '系统配置' },
    ];

    for (const p of pages) {
      console.log(`>>> 访问: ${p.name}`);
      await page.goto(ADMIN_URL + p.path);
      await page.waitForTimeout(800);

      const bodyText = await page.textContent('body');
      // 只检测真正的错误：Network Error/401/服务器错误
      if (bodyText.includes('Network Error') || bodyText.includes('401 Unauthorized') || bodyText.includes('Internal Server Error') || bodyText.includes('请求失败')) {
        issues.push(`${p.name} 页面加载报错`);
        console.log(`  ❌ ${p.name} 页面加载报错`);
      } else {
        console.log(`  ✅ ${p.name} 正常`);
      }
    }

    // 4. API 数据验证
    console.log('\n>>> API 数据验证');

    // 4a. 申报接收
    const declRes = await apiGetTenantDeclarations(token);
    const declData = declRes.data || [];
    const declTotal = declRes.pagination?.total || 0;
    console.log(`  申报接收: ${declTotal} 条 (API返回)`);

    // 4b. 工单管理
    const woRes = await apiGetWorkOrders(token);
    const woList = Array.isArray(woRes.data) ? woRes.data : (woRes.data?.list || []);
    console.log(`  生产阶段工单: ${woList.length} 条`);

    // 4c. 审核任务
    const reviewRes = await apiGetReviewTasks(token);
    const reviewData = reviewRes.data || {};
    const measCount = (reviewData.measurements || []).length;
    const designCount = (reviewData.designs || []).length;
    const constCount = (reviewData.internalVerifications || []).length;
    console.log(`  审核任务: 测量=${measCount}, 设计=${designCount}, 施工=${constCount}`);

    // 4d. 生产批次
    const batchRes = await apiGetProductionBatches(token);
    const batchData = batchRes.data || {};
    const batchList = batchData.list || [];
    console.log(`  生产批次: ${batchData.total || 0} 条`);

    // 5. 工单详情页
    if (declData.length > 0) {
      console.log('\n>>> 工单详情页测试');
      const firstWo = declData[0];
      const woId = firstWo.work_order?.id;
      if (woId) {
        await page.goto(ADMIN_URL + `/work-orders/${woId}`);
        await page.waitForTimeout(2000);
        const detailBody = await page.textContent('body');
        if (detailBody.includes('Network Error') || detailBody.includes('401')) {
          issues.push('工单详情页加载失败');
        } else {
          console.log(`  ✅ 工单详情 ${woId} 加载正常`);
        }
      }
    }

    // 报告
    console.log('\n========== 测试报告 ==========');
    if (issues.length === 0) {
      console.log('全部通过！');
    } else {
      console.log(`发现 ${issues.length} 个问题:`);
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }

    expect(issues).toHaveLength(0);
  });

  test.skip('申报创建→接收流程 (需甲方账号)', async ({ page }) => {
    console.log('>>> 创建测试申报单');
    const token = await apiLogin();
    const createRes = await apiCreateDeclaration(token);
    expect(createRes.code).toBe(0);
    const woNo = createRes.data?.work_order_no;
    console.log(`  工单号: ${woNo}`);

    // 前端登录
    await page.goto(ADMIN_URL + '/login');
    await page.waitForSelector('button:has-text("登 录")', { timeout: 10000 });
    await page.fill('input[placeholder="手机号"]', ADMIN_PHONE);
    await page.fill('input[placeholder="密码"]', ADMIN_PASSWORD);
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // 进入申报接收
    await page.goto(ADMIN_URL + '/declarations');
    await page.waitForTimeout(1500);

    // 检查新单是否在列表中
    const woLink = await page.locator(`text=${woNo}`);
    const found = await woLink.count();
    console.log(`  新单出现在申报列表: ${found > 0 ? '✅ 是' : '❌ 否'}`);

    if (found === 0) {
      // 可能是待审批状态，检查是否有"待审批"按钮
      const pendingBtn = await page.locator(`button:has-text("待审批")`);
      const pendingCount = await pendingBtn.count();
      console.log(`  待审批按钮数量: ${pendingCount}`);

      if (pendingCount > 0) {
        console.log('  新单处于待审批状态，无法直接接收');
        // 尝试审批通过
        const declRes = await apiGetTenantDeclarations(token);
        const declData = declRes.data || [];
        const newDecl = declData.find(d => d.work_order?.work_order_no === woNo);
        if (newDecl) {
          console.log(`  找到申报记录 ID=${newDecl.id}，尝试自动审批`);
          const approveRes = await apiApproveDecl(token, newDecl.id);
          console.log(`  审批结果: ${JSON.stringify(approveRes).slice(0, 200)}`);
        }
      }
    }

    expect(found).toBeGreaterThan(0);
  });
});
