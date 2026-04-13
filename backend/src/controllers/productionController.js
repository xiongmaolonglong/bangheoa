const { Op } = require('sequelize');
const { WoProduction, WorkOrder, WorkOrderLog, TenantUser } = require('../models');
const { success, error, paginate } = require('../utils/response');

// ==================== 工具函数 ====================

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

/**
 * 生成生产任务编号
 * 格式: PROD-YYYYMMDD-XXXX
 */
function generateProductionTaskNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PROD-${dateStr}-${random}`;
}

// ==================== 生产任务列表 ====================

/**
 * GET /api/v1/production/tasks
 * 生产任务列表
 * 筛选: ?status=&material_type=&page=&limit=
 */
async function listTasks(req, res) {
  const { status, material_type, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (status) where.status = status;
  if (material_type) where.material_type = material_type;

  // 如果需要按租户过滤，先查出该租户的工单ID
  if (tenantId) {
    const woIds = await WorkOrder.findAll({
      where: { tenant_id: tenantId },
      attributes: ['id'],
      raw: true,
    });
    if (woIds.length === 0) {
      return paginate(res, [], { page: parseInt(page, 10), limit: parseInt(limit, 10), total: 0, pages: 0 });
    }
    where.work_order_id = woIds.map(w => w.id);
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageSize = Math.min(Math.max(1, parseInt(limit, 10)), 100);

  const { count, rows } = await WoProduction.findAndCountAll({
    where,
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        attributes: ['id', 'work_order_no', 'title', 'current_stage', 'status'],
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

// ==================== 合并创建生产任务 ====================

/**
 * POST /api/v1/production/tasks/merge
 * 合并相同材料创建生产任务
 * 请求体: { work_order_ids: [1,2,3], material_type: "铝塑板", spec: "3mm", quantity: 50 }
 */
async function mergeTasks(req, res) {
  const { work_order_ids, material_type, spec, quantity } = req.body;

  if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
    return error(res, '工单ID列表不能为空', 400);
  }
  if (!material_type) {
    return error(res, '材料类型不能为空', 400);
  }

  // 验证工单存在
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: { [Op.in]: work_order_ids } };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrders = await WorkOrder.findAll({ where: woWhere });
  if (workOrders.length !== work_order_ids.length) {
    return error(res, '部分工单不存在', 404);
  }

  // 创建生产任务
  const productionTaskNo = generateProductionTaskNo();
  const production = await WoProduction.create({
    work_order_id: work_order_ids[0], // 主关联工单
    production_task_no: productionTaskNo,
    task_ids: work_order_ids, // 关联的所有工单
    material_type,
    spec: spec || null,
    quantity: quantity || 0,
    status: 'scheduled',
  });

  // 更新各工单状态为生产中
  await WorkOrder.update(
    { current_stage: 'production', status: 'producing' },
    { where: { id: { [Op.in]: work_order_ids } } },
  );

  // 记录日志
  for (const wo of workOrders) {
    await createLog(wo.id, req.user, 'production_task_created', 'production',
      `合并生产任务已创建: ${productionTaskNo}, 材料: ${material_type}`);
  }

  return success(res, production, '生产任务创建成功');
}

// ==================== 生产任务详情 ====================

/**
 * GET /api/v1/production/tasks/:id
 * 任务详情
 */
async function getTask(req, res) {
  const { id } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = { id: parseInt(id, 10) };

  // 租户隔离: 通过关联工单验证
  if (tenantId) {
    const production = await WoProduction.findByPk(id, {
      include: [{ model: WorkOrder, as: 'workOrder', attributes: ['id', 'tenant_id'] }],
    });
    if (!production || production.workOrder?.tenant_id !== tenantId) {
      return error(res, '生产任务不存在', 404);
    }
    return success(res, production);
  }

  const production = await WoProduction.findByPk(id, {
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        attributes: ['id', 'work_order_no', 'title', 'current_stage', 'status', 'client_id'],
        required: false,
      },
    ],
  });

  if (!production) {
    return error(res, '生产任务不存在', 404);
  }

  return success(res, production);
}

// ==================== 更新生产状态 ====================

/**
 * POST /api/v1/production/tasks/:id/status
 * 更新状态
 * 请求体: { status: 'scheduled'|'producing'|'completed'|'shipped'|'quality_checked'|'qualified'|'warehoused', notes: '' }
 */
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, notes, quality_result, quality_inspector, quality_date, quality_notes } = req.body;

  const validStatuses = ['scheduled', 'producing', 'completed', 'shipped', 'quality_checked', 'qualified', 'warehoused'];
  if (!status || !validStatuses.includes(status)) {
    return error(res, `无效的状态值，可选: ${validStatuses.join(', ')}`, 400);
  }

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const where = { id: parseInt(id, 10) };

  // 租户隔离验证
  if (tenantId) {
    const production = await WoProduction.findByPk(id, {
      include: [{ model: WorkOrder, as: 'workOrder', attributes: ['id', 'tenant_id'] }],
    });
    if (!production || production.workOrder?.tenant_id !== tenantId) {
      return error(res, '生产任务不存在', 404);
    }
  }

  const updateData = { status };
  if (status === 'completed') updateData.produced_at = new Date().toISOString().slice(0, 10);
  if (status === 'shipped') updateData.shipped_at = new Date().toISOString().slice(0, 10);
  // 质检字段
  if (quality_result) updateData.quality_result = quality_result;
  if (quality_inspector) updateData.quality_inspector = quality_inspector;
  if (quality_date) updateData.quality_date = quality_date;
  if (quality_notes) updateData.quality_notes = quality_notes;
  else if (notes) updateData.quality_notes = notes;

  const production = await WoProduction.findByPk(id);
  await production.update(updateData);

  // 如果是 warehoused，工单流转到施工环节
  if (status === 'warehoused' && production.task_ids && production.task_ids.length > 0) {
    await WorkOrder.update(
      { current_stage: 'construction', status: 'constructing' },
      { where: { id: { [Op.in]: production.task_ids } } },
    );

    for (const woId of production.task_ids) {
      await createLog(woId, req.user, 'production_warehoused', 'construction',
        `生产任务 ${production.production_task_no} 已入库，流转至施工环节`);
    }
  } else {
    await createLog(production.work_order_id, req.user, 'production_status_updated', 'production',
      `生产状态更新为: ${status}`);
  }

  return success(res, production, '生产状态已更新');
}

// ==================== 工厂领料登记 ====================

/**
 * POST /api/v1/production/material-pickup
 * 施工队领料
 * 请求体: { work_order_ids: [1,2], constructor_id, items: [{ material_type, quantity }] }
 */
async function materialPickup(req, res) {
  const { work_order_ids, constructor_id, items } = req.body;

  if (!work_order_ids || !Array.isArray(work_order_ids) || work_order_ids.length === 0) {
    return error(res, '工单ID列表不能为空', 400);
  }
  if (!constructor_id) {
    return error(res, '施工队ID不能为空', 400);
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return error(res, '领料明细不能为空', 400);
  }

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: { [Op.in]: work_order_ids } };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrders = await WorkOrder.findAll({ where: woWhere });
  if (workOrders.length !== work_order_ids.length) {
    return error(res, '部分工单不存在', 404);
  }

  // 为每个工单创建领料生产记录
  const results = [];
  for (const item of items) {
    const production = await WoProduction.create({
      work_order_id: work_order_ids[0],
      production_task_no: generateProductionTaskNo(),
      task_ids: work_order_ids,
      material_type: item.material_type,
      quantity: item.quantity,
      status: 'warehoused',
      quality_notes: `施工队领料 - 施工队ID: ${constructor_id}`,
    });
    results.push(production);
  }

  // 记录日志
  for (const wo of workOrders) {
    const itemSummary = items.map(i => `${i.material_type} x${i.quantity}`).join(', ');
    await createLog(wo.id, req.user, 'material_pickup', 'production',
      `施工队领料: ${itemSummary}`);
  }

  return success(res, { records: results }, '领料登记成功');
}

module.exports = {
  listTasks,
  mergeTasks,
  getTask,
  updateStatus,
  materialPickup,
};
