/**
 * 统一响应工具
 */
const response = {
  /**
   * 成功响应
   */
  success: (res, data = null, message = '操作成功') => {
    return res.json({
      code: 0,
      message,
      data
    });
  },

  /**
   * 失败响应
   */
  error: (res, message = '操作失败', code = 1, statusCode = 400) => {
    return res.status(statusCode).json({
      code,
      message,
      data: null
    });
  },

  /**
   * 分页响应
   */
  paginate: (res, list, total, page, pageSize) => {
    return res.json({
      code: 0,
      message: '操作成功',
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    });
  },

  /**
   * 未授权响应
   */
  unauthorized: (res, message = '未授权访问') => {
    return res.status(401).json({
      code: 401,
      message,
      data: null
    });
  },

  /**
   * 禁止访问响应
   */
  forbidden: (res, message = '禁止访问') => {
    return res.status(403).json({
      code: 403,
      message,
      data: null
    });
  },

  /**
   * 资源不存在响应
   */
  notFound: (res, message = '资源不存在') => {
    return res.status(404).json({
      code: 404,
      message,
      data: null
    });
  },

  /**
   * 服务器错误响应
   */
  serverError: (res, message = '服务器内部错误') => {
    return res.status(500).json({
      code: 500,
      message,
      data: null
    });
  }
};

module.exports = response;
