const { Op, fn, col } = require('sequelize');
const {
  WorkOrder,
  WorkOrderLog,
  WoDeclaration,
  WoApproval,
  WoAssignment,
  WoMeasurement,
  WoDesign,
  WoConstruction,
  WoFinance,
  WoAftersale,
  Client,
  ClientUser,
  TenantUser,
} = require('../models');
const { success, error, paginate } = require('../utils/response');
const { generateWorkOrderNo } = require('../services/workOrderNoService');

// ==================== 工具函数 ====================

/**
 * 将 Sequelize 返回的工单对象扁平化，方便前端直接使用
 */
function flattenWorkOrder(wo) {
  const obj = typeof wo.toJSON === 'function' ? wo.toJSON() : wo;
  const today = new Date().toISOString().split('T')[0];
  return {
    ...obj,
    client_name: obj.client?.name || null,
    project_type: obj.declaration?.project_type || null,
    address: obj.declaration?.full_address || null,
    contact_name: obj.declaration?.contact_name || null,
    contact_phone: obj.declaration?.contact_phone || null,
    assigned_to: obj.assignment?.assignee?.name || null,
    is_timeout: obj.deadline && obj.deadline < today ? true : false,
    measurement: (obj.measurements?.[0]) || null,
    design_count: obj.designs?.length || 0,
    construction_count: obj.constructions?.length || 0,
    aftersale_count: obj.aftersales?.length || 0,
    finance_summary: obj.finances?.[0] ? {
      quote_amount: obj.finances[0].quote_amount,
      budget_used: obj.finances[0].budget_used,
      status: obj.finances[0].status,
    } : null,
  };
}

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

// ==================== 工单创建 ====================

/**
 * POST /api/v1/work-orders
 * 广告商后台补录工单
 */
async function createWorkOrder(req, res) {
  const { title, client_id, client_user_id, project_category, description, deadline } = req.body;

  if (!title) {
    return error(res, '项目名称不能为空', 400);
  }
  if (!client_id) {
    return error(res, '请选择甲方企业', 400);
  }

  const tenantId = req.tenantId || req.user.tenant_id;

  // 验证甲方属于当前租户
  const client = await Client.findOne({ where: { id: client_id, tenant_id: tenantId } });
  if (!client) {
    return error(res, '甲方企业不存在或无权访问', 400);
  }

  // 验证甲方用户属于该甲方
  if (client_user_id) {
    const clientUser = await ClientUser.findOne({ where: { id: client_user_id, client_id } });
    if (!clientUser) {
      return error(res, '甲方用户不存在', 400);
    }
  }

  // 生成工单号
  const { work_order_no } = await generateWorkOrderNo(tenantId);

  const workOrder = await WorkOrder.create({
    work_order_no,
    tenant_id: tenantId,
    client_id,
    client_user_id: client_user_id || null,
    title,
    project_category: project_category || null,
    description: description || null,
    current_stage: 'assignment',
    status: 'submitted',
    deadline: deadline || null,
  });

  await createLog(workOrder.id, req.user, 'work_order_created', 'assignment',
    `补录工单：${title}`);

  return success(res, { id: workOrder.id, work_order_no: workOrder.work_order_no }, '工单创建成功', 201);
}

// ==================== 工单列表 ====================

/**
 * GET /api/v1/work-orders
 * 工单列表（支持筛选+分页+关键词搜索）
 */
async function listWorkOrders(req, res) {
  const { stage, status, client_id, project_category, assigned_to, start_date, end_date, page = 1, limit = 20, keyword } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;
  if (stage) where.current_stage = stage;
  if (status) where.status = status;
  if (client_id) where.client_id = parseInt(client_id, 10);
  if (project_category) where.project_category = project_category;
  if (assigned_to) where.assigned_tenant_user_id = parseInt(assigned_to, 10);
  if (start_date && end_date) {
    where.created_at = { [Op.between]: [start_date, end_date + ' 23:59:59'] };
  }

  // 关键词搜索 title、work_order_no 或 client_name
  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { work_order_no: { [Op.like]: `%${keyword}%` } },
      { '$client.name$': { [Op.like]: `%${keyword}%` } },
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
        model: WoAssignment,
        as: 'assignment',
        attributes: ['id'],
        required: false,
        include: [
          { model: TenantUser, as: 'assignee', attributes: ['id', 'name'] },
        ],
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

  return paginate(res, rows.map(flattenWorkOrder), pagination);
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
      { model: WoDesign, as: 'designs', required: false, attributes: ['id', 'status', 'created_at'] },
      { model: WoConstruction, as: 'constructions', required: false, attributes: ['id', 'status', 'created_at'] },
      { model: WoFinance, as: 'finances', required: false, attributes: ['id', 'quote_amount', 'budget_used', 'status'] },
      { model: WoAftersale, as: 'aftersales', required: false, attributes: ['id', 'status', 'created_at'] },
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

  const result = flattenWorkOrder(workOrder);
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

  // 超时工单详情（最近 10 条）
  const timeoutOrders = await WorkOrder.findAll({
    where: {
      ...where,
      deadline: { [Op.lt]: today },
      completed_at: null,
    },
    attributes: ['id', 'work_order_no', 'title', 'current_stage', 'deadline'],
    order: [['deadline', 'ASC']],
    limit: 10,
  });

  // 工单总数
  const totalCount = await WorkOrder.count({ where });

  return success(res, {
    total: totalCount,
    by_stage: byStage,
    by_status: byStatus,
    timeout_count: timeoutCount,
    timeout_orders: timeoutOrders,
  });
}

// ==================== 工单更新 ====================

/**
 * PUT /api/v1/work-orders/:id
 * 编辑工单（仅限 assignment 阶段且未派单）
 */
async function updateWorkOrder(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId || req.user.tenant_id;
  const { title, project_category, description } = req.body;

  const wo = await WorkOrder.findOne({
    where: { id: parseInt(id, 10), tenant_id: tenantId },
  });
  if (!wo) return error(res, '工单不存在', 404);

  if (wo.current_stage !== 'assignment' || wo.assigned_tenant_user_id) {
    return error(res, '该工单已进入后续环节，无法编辑', 400);
  }

  if (title !== undefined) wo.title = title;
  if (project_category !== undefined) wo.project_category = project_category;
  if (description !== undefined) wo.description = description;

  await wo.save();
  await createLog(wo.id, req.user, 'work_order_updated', 'assignment', '编辑工单信息');

  return success(res, flattenWorkOrder(wo), '更新成功');
}

// ==================== 工单删除 ====================

/**
 * DELETE /api/v1/work-orders/:id
 * 软删除工单（仅限 assignment 阶段且未派单）
 */
async function deleteWorkOrder(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId || req.user.tenant_id;

  const wo = await WorkOrder.findOne({
    where: { id: parseInt(id, 10), tenant_id: tenantId },
  });
  if (!wo) return error(res, '工单不存在', 404);

  if (wo.current_stage !== 'assignment' || wo.assigned_tenant_user_id) {
    return error(res, '该工单已进入后续环节，无法删除', 400);
  }

  await wo.destroy();
  await createLog(wo.id, req.user, 'work_order_deleted', 'assignment', '删除工单');

  return success(res, null, '删除成功');
}

// ==================== 阶段推进 ====================

const STAGE_ORDER = ['declaration', 'approval', 'assignment', 'measurement', 'design', 'production', 'construction', 'finance', 'archive'];
const STAGE_LABELS = {
  declaration: '申报', approval: '审批', assignment: '派单', measurement: '测量',
  design: '设计', production: '生产', construction: '施工', finance: '费用', archive: '归档'
};

/**
 * PUT /api/v1/work-orders/:id/advance
 * 推进工单到指定环节（只能向后推进）
 */
async function advanceWorkOrder(req, res) {
  const { id } = req.params;
  const { target_stage } = req.body;
  const tenantId = req.tenantId || req.user.tenant_id;

  if (!STAGE_ORDER.includes(target_stage)) return error(res, '无效的目标环节', 400);

  const wo = await WorkOrder.findOne({ where: { id: parseInt(id, 10), tenant_id: tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  const fromIdx = STAGE_ORDER.indexOf(wo.current_stage);
  const toIdx = STAGE_ORDER.indexOf(target_stage);
  if (toIdx <= fromIdx) return error(res, '只能向后推进', 400);

  wo.current_stage = target_stage;
  await wo.save();
  await createLog(wo.id, req.user, 'stage_advanced', target_stage, `推进到${STAGE_LABELS[target_stage]}`);

  return success(res, flattenWorkOrder(wo), '推进成功');
}

/**
 * PUT /api/v1/work-orders/:id/stage
 * 看板拖拽变更环节（允许最多跨2个环节）
 */
async function updateStage(req, res) {
  const { id } = req.params;
  const { target_stage } = req.body;
  const tenantId = req.tenantId || req.user.tenant_id;

  if (!STAGE_ORDER.includes(target_stage)) return error(res, '无效的目标环节', 400);

  const wo = await WorkOrder.findOne({ where: { id: parseInt(id, 10), tenant_id: tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  const fromIdx = STAGE_ORDER.indexOf(wo.current_stage);
  const toIdx = STAGE_ORDER.indexOf(target_stage);
  if (Math.abs(toIdx - fromIdx) > 2) return error(res, '不能跨环节移动，请通过详情页面操作', 400);

  const oldStage = wo.current_stage;
  wo.current_stage = target_stage;
  await wo.save();

  await createLog(wo.id, req.user, 'stage_changed', target_stage,
    `从${STAGE_LABELS[oldStage]}拖拽到${STAGE_LABELS[target_stage]}`);

  return success(res, flattenWorkOrder(wo), '环节已更新');
}

/**
 * POST /api/v1/work-orders/batch-advance
 * 批量推进工单到指定环节
 */
async function batchAdvance(req, res) {
  const { work_order_ids, target_stage } = req.body;
  if (!work_order_ids?.length) return error(res, '工单ID列表不能为空', 400);
  if (!STAGE_ORDER.includes(target_stage)) return error(res, '无效的目标环节', 400);

  const tenantId = req.tenantId || req.user.tenant_id;
  const updated = [];
  const skipped = [];

  for (const id of work_order_ids) {
    const wo = await WorkOrder.findOne({ where: { id: parseInt(id, 10), tenant_id: tenantId } });
    if (!wo) { skipped.push({ id, reason: '不存在' }); continue; }
    const fromIdx = STAGE_ORDER.indexOf(wo.current_stage);
    const toIdx = STAGE_ORDER.indexOf(target_stage);
    if (toIdx <= fromIdx) { skipped.push({ id, reason: '环节不能回退' }); continue; }

    const oldStage = wo.current_stage;
    wo.current_stage = target_stage;
    await wo.save();
    await createLog(wo.id, req.user, 'batch_stage_changed', target_stage,
      `批量从${STAGE_LABELS[oldStage]}到${STAGE_LABELS[target_stage]}`);
    updated.push(id);
  }

  return success(res, { updated, skipped }, `成功推进 ${updated.length} 个工单`);
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
  createWorkOrder,
  listWorkOrders,
  getWorkOrder,
  getWorkOrderStats,
  getWorkOrderLogs,
  updateWorkOrder,
  deleteWorkOrder,
  advanceWorkOrder,
  updateStage,
  batchAdvance,
};
