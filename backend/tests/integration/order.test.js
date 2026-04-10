const request = require('supertest');
const app = require('../../src/app');
const { Order, ORDER_STATUS } = require('../../src/models');

describe('订单 API', () => {
  let adminToken;
  let measurerToken;

  beforeAll(async () => {
    // 获取管理员 token
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.data.token;

    // 获取测量员 token
    const measurerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'measurer', password: 'measurer123' });
    measurerToken = measurerRes.body.data?.token;
  });

  describe('GET /api/v1/orders', () => {
    it('应该返回订单列表', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get(`/api/v1/orders?status=${ORDER_STATUS.PENDING_REVIEW}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.list.forEach(order => {
        expect(order.status).toBe(ORDER_STATUS.PENDING_REVIEW);
      });
    });

    it('应该支持关键词搜索', async () => {
      const response = await request(app)
        .get('/api/v1/orders?keyword=测试')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/orders', () => {
    const newOrder = {
      customer_name: '测试客户',
      customer_phone: '13800138000',
      title: '测试订单',
      address: '测试地址',
      group_id: 1,
      adItems: [
        {
          face_name: '测试面',
          width: 10,
          height: 5
        }
      ]
    };

    it('应该成功创建订单', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newOrder);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('order_no');
      expect(response.body.data.customer_name).toBe(newOrder.customer_name);
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/orders/:id/status', () => {
    let testOrderId;

    beforeAll(async () => {
      // 创建测试订单
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer_name: '状态测试',
          customer_phone: '13900139000',
          title: '状态测试订单',
          address: '测试地址',
          group_id: 1
        });
      testOrderId = res.body.data.id;
    });

    it('应该成功更新订单状态', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ORDER_STATUS.MEASURING,
          comment: '审核通过，开始测量'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(ORDER_STATUS.MEASURING);
    });

    it('应该拒绝无效的状态转换', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ORDER_STATUS.ARCHIVED // 跳过中间状态
        });

      expect(response.status).toBe(400);
    });
  });
});