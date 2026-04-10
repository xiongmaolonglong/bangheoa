/**
 * 审计日志控制器
 */

const auditService = require('../middleware/audit');
const response = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 获取审计日志列表
 */
exports.list = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditLogs(req.query);
  response.success(res, result);
});

/**
 * 获取用户操作统计
 */
exports.userStats = asyncHandler(async (req, res) => {
  const { user_id, days = 30 } = req.query;
  const stats = await auditService.getUserActionStats(user_id || req.user.id, days);
  response.success(res, stats);
});

/**
 * 导出审计日志
 */
exports.export = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const result = await auditService.getAuditLogs({
    start_date,
    end_date,
    limit: 10000
  });

  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${start_date}-${end_date}.json`);

  response.success(res, result.list);
});