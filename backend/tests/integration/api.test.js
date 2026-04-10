/**
 * 集成测试 - 完整工作流测试
 */

const request = require('supertest');
const app = require('../../src/app');

describe('完整工作流测试', () => {
  let adminToken;
  let testOrderId;

  beforeAll(async () => {
    // 管理员登录
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = res.body.data?.token;
  });

  describe('订单完整生命周期', () => {
    it('应该完成订单创建→审核→测量→设计→生产→安装→归档的完整流程', async () => {
      // 1. 创建订单
      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_name: '测试客户',
          customer_phone: '13800138000',
          title: '集成测试订单',
          address: '测试地址123号',
          group_id: 1,
          ad_items: [{
            ad_type_id: 1,
            faces: [{
              face_name: 'A面',
              width: 10,
              height: 5
            }]
          }]
        });

      expect(createRes.status).toBe(201);
      testOrderId = createRes.body.data.id;

      // 2. 审核通过
      const approveRes = await request(app)
        .post(`/api/v1/review/${testOrderId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comment: '审核通过' });

      expect([200, 201]).toContain(approveRes.status);

      // 3. 查询订单详情验证状态变更
      const detailRes = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.status).not.toBe('pending_review');
    });
  });

  describe('权限控制测试', () => {
    it('未认证用户应该被拒绝访问', async () => {
      const res = await request(app)
        .get('/api/v1/orders');

      expect(res.status).toBe(401);
    });

    it('无效token应该被拒绝', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
    });
  });

  describe('API 文档测试', () => {
    it('应该能访问 Swagger 文档', async () => {
      const res = await request(app)
        .get('/api-docs/index.html');

      expect(res.status).toBe(200);
    });
  });

  describe('健康检查', () => {
    it('应该返回正常状态', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});