// 测试环境配置
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'outdoor_ad_system_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';

// 增加测试超时时间
jest.setTimeout(10000);

// 全局钩子
beforeAll(async () => {
  // 可以在这里初始化测试数据库连接
});

afterAll(async () => {
  // 清理测试数据
});

// 错误处理
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection in tests:', err);
});
