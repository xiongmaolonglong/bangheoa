const response = require('../../src/utils/response');

describe('响应工具函数', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('success', () => {
    it('应该返回成功响应', () => {
      const data = { id: 1, name: 'test' };
      response.success(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      });
    });
  });

  describe('error', () => {
    it('应该返回错误响应', () => {
      response.error(mockRes, '操作失败', 'OPERATION_FAILED', 400);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '操作失败',
        code: 'OPERATION_FAILED'
      });
    });
  });

  describe('unauthorized', () => {
    it('应该返回 401 未授权响应', () => {
      response.unauthorized(mockRes, '请先登录');

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '请先登录',
        code: 'UNAUTHORIZED'
      });
    });
  });

  describe('forbidden', () => {
    it('应该返回 403 禁止访问响应', () => {
      response.forbidden(mockRes, '无权访问');

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '无权访问',
        code: 'FORBIDDEN'
      });
    });
  });

  describe('notFound', () => {
    it('应该返回 404 未找到响应', () => {
      response.notFound(mockRes, '订单不存在');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '订单不存在',
        code: 'NOT_FOUND'
      });
    });
  });

  describe('paginated', () => {
    it('应该返回分页响应', () => {
      const list = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 100 };

      response.paginated(mockRes, list, pagination);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          list,
          pagination
        }
      });
    });
  });
});