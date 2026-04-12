const { Op } = require('sequelize');
const { WoConstruction, WorkOrder, WorkOrderLog, TenantUser } = require('../models');
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

// ==================== 施工任务列表 ====================

/**
 * GET /api/v1/construction/tasks
 * 施工员任务列表
 * 筛选: ?status=&page=&limit=
 */
async function listTasks(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (status) where.status = status;

  // 如果当前用户是施工员，只显示自己的任务
  if (req.user.user_type === 'tenant' && req.user.user_id) {
    where.constructor_id = req.user.user_id;
  }

  // 租户隔离
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

  const { count, rows } = await WoConstruction.findAndCountAll({
    where,
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        attributes: ['id', 'work_order_no', 'title', 'current_stage', 'status', 'deadline'],
        required: false,
      },
      {
        model: TenantUser,
        as: 'constructor',
        attributes: ['id', 'real_name', 'phone'],
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

// ==================== 施工任务详情 ====================

/**
 * GET /api/v1/construction/tasks/:workOrderId
 * 详情（按工单ID查询）
 */
async function getTask(req, res) {
  const { workOrderId } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const woWhere = { id: parseInt(workOrderId, 10) };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({ where: woWhere });
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const constructions = await WoConstruction.findAll({
    where: { work_order_id: workOrder.id },
    include: [
      {
        model: TenantUser,
        as: 'constructor',
        attributes: ['id', 'real_name', 'phone'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
  });

  const result = {
    work_order: workOrder,
    constructions,
  };

  return success(res, result);
}

// ==================== 提交施工记录 ====================

/**
 * POST /api/v1/construction/:workOrderId
 * 提交施工记录
 * 请求体: { before_photos, during_photos, after_photos, notes, duration_minutes, signature_path }
 */
async function submitConstruction(req, res) {
  const { workOrderId } = req.params;
  const { before_photos, during_photos, after_photos, notes, duration_minutes, signature_path } = req.body;

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: parseInt(workOrderId, 10) };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({ where: woWhere });
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  // 创建施工记录
  const construction = await WoConstruction.create({
    work_order_id: workOrder.id,
    constructor_id: req.user.user_id,
    before_photos: before_photos || [],
    during_photos: during_photos || [],
    after_photos: after_photos || [],
    notes: notes || null,
    duration_minutes: duration_minutes || 0,
    signature_path: signature_path || null,
    status: 'completed',
    constructed_at: new Date().toISOString().slice(0, 10),
  });

  // 更新工单状态
  await workOrder.update({
    current_stage: 'construction',
    status: 'completed',
  });

  // 记录日志
  await createLog(workOrder.id, req.user, 'construction_submitted', 'construction',
    `施工记录已提交${notes ? ': ' + notes : ''}`);

  return success(res, construction, '施工记录已提交');
}

// ==================== 内部验收 ====================

/**
 * POST /api/v1/construction/:workOrderId/internal-verify
 * 内部审核验收
 * 请求体: { verified: true, notes: '' }
 */
async function internalVerify(req, res) {
  const { workOrderId } = req.params;
  const { verified, notes } = req.body;

  if (typeof verified !== 'boolean') {
    return error(res, 'verified 必须为布尔值', 400);
  }

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: parseInt(workOrderId, 10) };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({ where: woWhere });
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  // 查找最新的施工记录
  const construction = await WoConstruction.findOne({
    where: { work_order_id: workOrder.id },
    order: [['created_at', 'DESC']],
  });

  if (!construction) {
    return error(res, '施工记录不存在', 404);
  }

  if (verified) {
    await construction.update({
      status: 'internally_verified',
      internal_verified_at: new Date().toISOString().slice(0, 10),
    });

    await createLog(workOrder.id, req.user, 'internal_verified', 'construction',
      `内部验收通过${notes ? ': ' + notes : ''}`);

    return success(res, construction, '内部验收通过，已推送甲方验收');
  } else {
    // 未通过，退回施工
    await construction.update({
      status: 'installing',
    });

    await createLog(workOrder.id, req.user, 'internal_verify_rejected', 'construction',
      `内部验收未通过: ${notes || '请整改后重新提交'}`);

    return success(res, construction, '内部验收未通过，已退回整改');
  }
}

// ==================== 甲方验收 ====================

/**
 * POST /api/v1/construction/:workOrderId/verify
 * 甲方验收（电子签名）
 * 请求体: { verified: true, signature_path: '' }
 */
async function clientVerify(req, res) {
  const { workOrderId } = req.params;
  const { verified, signature_path } = req.body;

  if (typeof verified !== 'boolean') {
    return error(res, 'verified 必须为布尔值', 400);
  }

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: parseInt(workOrderId, 10) };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({ where: woWhere });
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const construction = await WoConstruction.findOne({
    where: { work_order_id: workOrder.id },
    order: [['created_at', 'DESC']],
  });

  if (!construction) {
    return error(res, '施工记录不存在', 404);
  }

  if (verified) {
    const updateData = {
      client_verified_at: new Date().toISOString().slice(0, 10),
      status: 'accepted',
    };
    if (signature_path) updateData.signature_path = signature_path;

    await construction.update(updateData);

    // 工单流转到费用环节
    await workOrder.update({
      current_stage: 'finance',
      status: 'quoting',
    });

    await createLog(workOrder.id, req.user, 'client_accepted', 'construction',
      '甲方验收通过，流转至费用环节');

    return success(res, construction, '甲方验收通过，已流转至费用环节');
  } else {
    await construction.update({
      status: 'installing',
      client_verified_at: null,
    });

    // 工单退回施工状态
    await workOrder.update({
      status: 'constructing',
    });

    await createLog(workOrder.id, req.user, 'client_verify_rejected', 'construction',
      `甲方验收未通过: ${signature_path || '请整改后重新验收'}`);

    return success(res, construction, '甲方验收未通过，已退回整改');
  }
}

// ==================== 施工异常上报 ====================

/**
 * POST /api/v1/construction/:workOrderId/exception
 * 异常上报
 * 请求体: { type: '尺寸变更|现场条件变化|材料不匹配|其他', description: '', photos: [], urgency: 'normal|urgent' }
 */
async function reportException(req, res) {
  const { workOrderId } = req.params;
  const { type, description, photos, urgency } = req.body;

  if (!type || !description) {
    return error(res, '异常类型和描述不能为空', 400);
  }

  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  const woWhere = { id: parseInt(workOrderId, 10) };
  if (tenantId) woWhere.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({ where: woWhere });
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const exceptionDetail = {
    type,
    description,
    photos: photos || [],
    urgency: urgency || 'normal',
    reported_by: req.user.user_id,
    reported_at: new Date().toISOString(),
  };

  // 记录到施工日志
  await createLog(workOrder.id, req.user, 'construction_exception', 'construction',
    `异常上报[${urgency || 'normal'}] ${type}: ${description}`);

  return success(res, { exception: exceptionDetail }, '异常已上报，相关人员将收到通知');
}

module.exports = {
  listTasks,
  getTask,
  submitConstruction,
  internalVerify,
  clientVerify,
  reportException,
};
