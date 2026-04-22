const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  logger.error('错误:', err);

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return response.error(res, messages.join(', '));
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    return response.error(res, '数据已存在');
  }

  // Sequelize 外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return response.error(res, '关联数据不存在或无法删除');
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return response.unauthorized(res, 'Token 无效');
  }

  if (err.name === 'TokenExpiredError') {
    return response.unauthorized(res, 'Token 已过期');
  }

  // 默认服务器错误
  return response.serverError(res, process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误');
};

/**
 * 404 处理中间件
 */
const notFound = (req, res, next) => {
  return response.notFound(res, `路由 ${req.method} ${req.path} 不存在`);
};

module.exports = { errorHandler, notFound };
