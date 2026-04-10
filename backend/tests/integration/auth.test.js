const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');

describe('认证 API', () => {
  const testUser = {
    username: 'testuser',
    password: 'Test123456',
    real_name: '测试用户',
    phone: '13800138000',
    role: 'measurer'
  };

  describe('POST /api/v1/auth/login', () => {
    it('应该成功登录并返回 token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('应该拒绝错误的密码', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('应该拒绝不存在的用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let token;

    beforeAll(async () => {
      // 登录获取 token
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      token = response.body.data.token;
    });

    it('应该返回当前用户信息', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('username');
    });

    it('应该拒绝无 token 的请求', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
    });

    it('应该拒绝无效的 token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });
});