/**
 * 操作审计中间件
 * 记录所有关键操作日志
 */

const { AuditLog } = require('../models');

/**
 * 审计中间件
 * @param {string} action - 操作类型
 */
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // 保存原始 send 方法
    const originalSend = res.send;
    const originalJson = res.json;

    // 拦截响应
    res.send = function (body) {
      recordAudit(req, res, action, startTime, body);
      return originalSend.call(this, body);
    };

    res.json = function (body) {
      recordAudit(req, res, action, startTime, body);
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * 记录审计日志
 */
async function recordAudit(req, res, action, startTime, responseBody) {
  try {
    // 只记录需要审计的操作
    const auditableMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!auditableMethods.includes(req.method)) return;

    // 排除不需要审计的路由
    const excludePaths = ['/api/v1/auth/login', '/api/v1/auth/logout', '/api-docs'];
    if (excludePaths.some(p => req.path.startsWith(p))) return;

    const duration = Date.now() - startTime;

    // 解析响应体
    let responseStatus = 'success';
    let responseMessage = '';
    try {
      if (typeof responseBody === 'string') {
        const parsed = JSON.parse(responseBody);
        responseStatus = parsed.success !== false ? 'success' : 'failed';
        responseMessage = parsed.message || '';
      } else if (responseBody && typeof responseBody === 'object') {
        responseStatus = responseBody.success !== false ? 'success' : 'failed';
        responseMessage = responseBody.message || '';
      }
    } catch (e) {
      // 解析失败，使用默认值
    }

    // 构建审计记录
    const auditData = {
      user_id: req.user?.id || null,
      username: req.user?.username || 'anonymous',
      action,
      method: req.method,
      path: req.path,
      query: JSON.stringify(req.query),
      body: sanitizeBody(req.body),
      params: JSON.stringify(req.params),
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'] || '',
      status_code: res.statusCode,
      response_status: responseStatus,
      response_message: responseMessage.substring(0, 500),
      duration,
      created_at: new Date()
    };

    // 异步保存日志
    await AuditLog.create(auditData).catch(err => {
      console.error('保存审计日志失败:', err);
    });

  } catch (err) {
    console.error('记录审计日志错误:', err);
  }
}

/**
 * 获取客户端 IP
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '';
}

/**
 * 清理敏感信息
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return '{}';

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'old_password', 'new_password', 'token', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '******';
    }
  });

  // 限制大小
  const str = JSON.stringify(sanitized);
  if (str.length > 5000) {
    return str.substring(0, 5000) + '...';
  }

  return str;
}

/**
 * 查询审计日志
 */
async function getAuditLogs(params) {
  const { page = 1, limit = 20, user_id, action, start_date, end_date, status } = params;

  const where = {};

  if (user_id) where.user_id = user_id;
  if (action) where.action = action;
  if (status) where.response_status = status;

  if (start_date && end_date) {
    where.created_at = {
      [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
    };
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  return {
    list: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  };
}

/**
 * 获取用户操作统计
 */
async function getUserActionStats(userId, days = 30) {
  const { Op } = require('sequelize');
  const sequelize = require('../config/database').sequelize;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await AuditLog.findAll({
    where: {
      user_id: userId,
      created_at: { [Op.gte]: startDate }
    },
    attributes: [
      'action',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('DATE', sequelize.col('created_at')), 'date']
    ],
    group: ['action', sequelize.fn('DATE', sequelize.col('created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']]
  });

  return stats;
}

module.exports = {
  auditMiddleware,
  getAuditLogs,
  getUserActionStats
};