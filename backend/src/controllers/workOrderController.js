const { Op, fn, col } = require('sequelize');
const {
  WorkOrder,
  WorkOrderLog,
  WoDeclaration,
  WoApproval,
  WoAssignment,
  WoMeasurement,
  Client,
} = require('../models');
const { success, error, paginate } = require('../utils/response');

// ==================== 工具函数 ====================

/**
 * 创建工单操作日志
 * @param {number} workOrderId - 工单ID
 * @param {object} user - req.user
 * @param {string} action - 操作类型
 * @param {string} stage - 当前环节
 * @param {string} detail - 操作详情
 */
async function createLog(workOrderId, user, action, stage, detail) {
  return WorkOrderLog.create({
    work_order_id: workOrderId,
    user_id: user.user_id,
    user_type: user.user_type,
    action,
    stage,
    detail,
    ip_address: user._ip || null,
  });
}

// ==================== 工单列表 ====================

/**
 * GET /api/v1/work-orders
 * 工单列表（支持筛选+分页+关键词搜索）
 */
async function listWorkOrders(req, res) {
  const { stage, status, client_id, page = 1, limit = 20, keyword } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;
  if (stage) where.current_stage = stage;
  if (status) where.status = status;
  if (client_id) where.client_id = parseInt(client_id, 10);

  // 关键词搜索 title 或 work_order_no
  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { work_order_no: { [Op.like]: `%${keyword}%` } },
    ];
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageSize = Math.min(Math.max(1, parseInt(limit, 10)), 100);

  const { count, rows } = await WorkOrder.findAndCountAll({
    where,
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'name'],
      },
      {
        model: WoDeclaration,
        as: 'declaration',
        attributes: ['id', 'full_address', 'project_type', 'contact_name', 'contact_phone'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset,
  });

  const pagination = {
    page: parseInt(page, 10),
    limit: pageSize,
    total: count,
    pages: Math.ceil(count / pageSize),
  };

  return paginate(res, rows, pagination);
}

// ==================== 工单详情 ====================

/**
 * GET /api/v1/work-orders/:id
 * 工单详情（完整信息 + 所有环节数据 + 操作日志时间线）
 */
async function getWorkOrder(req, res) {
  const { id } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = { id: parseInt(id, 10) };
  if (tenantId) where.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({
    where,
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name'] },
      { model: WoDeclaration, as: 'declaration', required: false },
      { model: WoApproval, as: 'approval', required: false },
      { model: WoAssignment, as: 'assignment', required: false },
      { model: WoMeasurement, as: 'measurements', required: false },
    ],
    order: [
      [{ model: WoMeasurement, as: 'measurements' }, 'created_at', 'DESC'],
    ],
  });

  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  // 获取操作日志时间线
  const logs = await WorkOrderLog.findAll({
    where: { work_order_id: workOrder.id },
    order: [['created_at', 'DESC']],
  });

  const result = workOrder.toJSON();
  result.logs = logs;

  return success(res, result);
}

// ==================== 工单统计 ====================

/**
 * GET /api/v1/work-orders/stats
 * 工单统计（按环节/状态分组 + 超时工单）
 */
async function getWorkOrderStats(req, res) {
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;

  // 各环节工单数量（按 current_stage 分组）
  const stageCounts = await WorkOrder.findAll({
    where,
    attributes: [
      'current_stage',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['current_stage'],
    raw: true,
  });

  const byStage = {};
  for (const row of stageCounts) {
    byStage[row.current_stage] = parseInt(row.count, 10);
  }

  // 按状态分组计数
  const statusCounts = await WorkOrder.findAll({
    where,
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const byStatus = {};
  for (const row of statusCounts) {
    byStatus[row.status] = parseInt(row.count, 10);
  }

  // 超时工单：deadline 已过期且未完成
  const today = new Date().toISOString().split('T')[0];
  const timeoutCount = await WorkOrder.count({
    where: {
      ...where,
      deadline: { [Op.lt]: today },
      completed_at: null,
    },
  });

  // 工单总数
  const totalCount = await WorkOrder.count({ where });

  return success(res, {
    total: totalCount,
    by_stage: byStage,
    by_status: byStatus,
    timeout_count: timeoutCount,
  });
}

// ==================== 操作日志 ====================

/**
 * GET /api/v1/work-orders/:id/logs
 * 工单操作日志列表
 */
async function getWorkOrderLogs(req, res) {
  const { id } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  // 先确认工单属于当前租户
  const workOrderWhere = { id: parseInt(id, 10) };
  if (tenantId) workOrderWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({
    where: workOrderWhere,
    attributes: ['id'],
  });

  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const logs = await WorkOrderLog.findAll({
    where: { work_order_id: workOrder.id },
    order: [['created_at', 'DESC']],
  });

  return success(res, logs);
}

module.exports = {
  createLog,
  listWorkOrders,
  getWorkOrder,
  getWorkOrderStats,
  getWorkOrderLogs,
};
