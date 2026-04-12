const { Op } = require('sequelize');
const WoAssignment = require('../models/WoAssignment');
const WoMeasurement = require('../models/WoMeasurement');
const WorkOrder = require('../models/WorkOrder');
const WorkOrderLog = require('../models/WorkOrderLog');
const Notification = require('../models/Notification');
const TenantUser = require('../models/TenantUser');
const { success, error, paginate } = require('../utils/response');
const { buildTenantFilter } = require('../middleware/tenant');

/**
 * 确保工单属于当前租户
 */
function ensureWorkOrderOwnership(req, workOrderId) {
  const where = { id: workOrderId };
  buildTenantFilter(WorkOrder, where)(req);
  return where;
}

// ==================== 辅助函数 ====================

/**
 * 记录工单日志
 */
async function createLog(workOrderId, userId, action, stage, detail, ip) {
  return WorkOrderLog.create({
    work_order_id: workOrderId,
    user_id: userId,
    user_type: 'tenant',
    action,
    stage,
    detail: detail || null,
    ip_address: ip || null,
  });
}

/**
 * 发送通知
 */
async function sendNotification(userId, title, content, type, workOrderId) {
  return Notification.create({
    user_id: userId,
    user_type: 'tenant',
    title,
    content,
    type,
    work_order_id: workOrderId,
  });
}

// ==================== 派单管理 ====================

/**
 * GET /api/v1/assignments - 待派单列表
 */
async function listAssignments(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    buildTenantFilter(WorkOrder, where)(req);
    if (status) where['$assignment.status$'] = status;

    const { count, rows } = await WorkOrder.findAndCountAll({
      where,
      include: [
        {
          model: WoAssignment,
          as: 'assignment',
          include: [
            { model: TenantUser, as: 'assigner', attributes: ['id', 'name', 'phone'] },
            { model: TenantUser, as: 'assignee', attributes: ['id', 'name', 'phone'] },
          ],
        },
        { model: TenantUser, as: 'assignee', attributes: ['id', 'name', 'phone'] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['id', 'DESC']],
      subQuery: false,
    });

    return paginate(res, rows, {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('listAssignments error:', err);
    return error(res, '获取派单列表失败');
  }
}

/**
 * POST /api/v1/assignments - 创建派单
 */
async function createAssignment(req, res) {
  try {
    const { work_order_id, assigned_to, deadline, notes } = req.body;

    if (!work_order_id) return error(res, '工单ID不能为空', 400);
    if (!assigned_to) return error(res, '被派单人员不能为空', 400);

    // 验证工单存在且属于当前租户
    const where = ensureWorkOrderOwnership(req, work_order_id);
    const workOrder = await WorkOrder.findOne({ where });
    if (!workOrder) return error(res, '工单不存在或无权操作', 404);

    // 验证被派单的测量员存在
    const measurer = await TenantUser.findByPk(assigned_to);
    if (!measurer) return error(res, '被派单人员不存在', 404);

    // 1. 创建派单记录
    const assignment = await WoAssignment.create({
      work_order_id,
      assigned_by: req.user.user_id,
      assigned_to,
      status: 'assigned',
      deadline: deadline || null,
      notes: notes || null,
    });

    // 2. 更新工单状态
    await workOrder.update({
      current_stage: 'measurement',
      status: 'assigned',
      assigned_tenant_user_id: assigned_to,
    });

    // 3. 记录日志
    await createLog(
      work_order_id,
      req.user.user_id,
      'create_assignment',
      'assignment',
      `派单给 ${measurer.name}，截止日期: ${deadline || '未设置'}`,
      req.ip
    );

    // 4. 发送通知给被派单的测量员
    await sendNotification(
      assigned_to,
      '新派单通知',
      `您有新的测量任务：${workOrder.title}，工单号：${workOrder.work_order_no}`,
      'assignment',
      work_order_id
    );

    return success(res, assignment, '派单成功', 201);
  } catch (err) {
    console.error('createAssignment error:', err);
    return error(res, '派单失败');
  }
}

/**
 * GET /api/v1/assignments/:id - 派单详情
 */
async function getAssignment(req, res) {
  try {
    const assignment = await WoAssignment.findByPk(req.params.id, {
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          include: [
            { model: TenantUser, as: 'assignee', attributes: ['id', 'name', 'phone'] },
          ],
        },
        { model: TenantUser, as: 'assigner', attributes: ['id', 'name', 'phone'] },
        { model: TenantUser, as: 'assignee', attributes: ['id', 'name', 'phone', 'role'] },
      ],
    });

    if (!assignment) return error(res, '派单记录不存在', 404);

    return success(res, assignment);
  } catch (err) {
    console.error('getAssignment error:', err);
    return error(res, '获取派单详情失败');
  }
}

/**
 * PUT /api/v1/assignments/:id/receive - 测量员确认接收
 */
async function receiveAssignment(req, res) {
  try {
    const assignment = await WoAssignment.findByPk(req.params.id, {
      include: [{ model: WorkOrder, as: 'workOrder' }],
    });

    if (!assignment) return error(res, '派单记录不存在', 404);
    if (assignment.assigned_to !== req.user.user_id) {
      return error(res, '无权操作此派单', 403);
    }

    await assignment.update({ status: 'received' });

    // 更新工单状态
    if (assignment.workOrder) {
      await assignment.workOrder.update({
        current_stage: 'measurement',
        status: 'measuring',
      });
    }

    // 记录日志
    await createLog(
      assignment.work_order_id,
      req.user.user_id,
      'receive_assignment',
      'measurement',
      '测量员已确认接收派单',
      req.ip
    );

    return success(res, assignment, '已确认接收');
  } catch (err) {
    console.error('receiveAssignment error:', err);
    return error(res, '确认接收失败');
  }
}

// ==================== 测量任务 ====================

/**
 * GET /api/v1/measurements/tasks - 测量员任务列表
 */
async function listMeasurementTasks(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.user_id;

    // 查询当前用户被派单的工单
    const where = {
      assigned_tenant_user_id: userId,
      current_stage: 'measurement',
    };

    if (status) where.status = status;

    const { count, rows } = await WorkOrder.findAndCountAll({
      where,
      include: [
        { model: WoAssignment, as: 'assignment' },
        { model: WoMeasurement, as: 'measurements' },
      ],
      limit: parseInt(limit),
      offset,
      order: [['id', 'DESC']],
    });

    return paginate(res, rows, {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('listMeasurementTasks error:', err);
    return error(res, '获取测量任务列表失败');
  }
}

/**
 * GET /api/v1/measurements/tasks/:workOrderId - 任务详情
 */
async function getMeasurementTask(req, res) {
  try {
    const where = ensureWorkOrderOwnership(req, req.params.workOrderId);
    const workOrder = await WorkOrder.findOne({
      where,
      include: [
        { model: WoAssignment, as: 'assignment' },
        { model: WoMeasurement, as: 'measurements', order: [['id', 'DESC']], limit: 1 },
      ],
    });

    if (!workOrder) return error(res, '工单不存在', 404);

    return success(res, workOrder);
  } catch (err) {
    console.error('getMeasurementTask error:', err);
    return error(res, '获取任务详情失败');
  }
}

/**
 * POST /api/v1/measurements/:workOrderId - 提交测量数据
 */
async function submitMeasurement(req, res) {
  try {
    const { workOrderId } = req.params;
    const { basic_info, materials, signature_path } = req.body;

    if (!workOrderId) return error(res, '工单ID不能为空', 400);
    if (!basic_info) return error(res, '基本信息不能为空', 400);

    // 验证工单存在
    const where = ensureWorkOrderOwnership(req, workOrderId);
    const workOrder = await WorkOrder.findOne({ where });
    if (!workOrder) return error(res, '工单不存在', 404);

    // 自动计算面积
    if (materials && Array.isArray(materials)) {
      for (const material of materials) {
        if (material.faces && Array.isArray(material.faces)) {
          for (const face of material.faces) {
            if (face.width != null && face.height != null && face.area == null) {
              face.area = Number((face.width * face.height).toFixed(4));
            }
          }
        }
      }
    }

    // 1. 创建或更新测量记录（同一工单只保留最新一条）
    let measurement = await WoMeasurement.findOne({ where: { work_order_id: workOrderId } });

    const measurementData = {
      work_order_id: workOrderId,
      measurer_id: req.user.user_id,
      basic_info,
      materials: materials || null,
      signature_path: signature_path || null,
      status: 'measured',
      measured_at: new Date().toISOString().slice(0, 10),
    };

    if (measurement) {
      await measurement.update(measurementData);
    } else {
      measurement = await WoMeasurement.create(measurementData);
    }

    // 2. 更新工单状态
    await workOrder.update({
      current_stage: 'measurement',
      status: 'measured',
    });

    // 3. 记录日志
    const materialSummary = materials
      ? materials.map(m => `${m.type}: ${m.faces?.length || 0}个面`).join('; ')
      : '';
    await createLog(
      workOrderId,
      req.user.user_id,
      'submit_measurement',
      'measurement',
      `提交测量数据，材料: ${materialSummary}`,
      req.ip
    );

    // 4. 发送通知给设计师（工单流转到设计环节）
    // 通知派单员/管理员测量已完成
    if (workOrder.assigned_tenant_user_id) {
      await sendNotification(
        workOrder.assigned_tenant_user_id,
        '测量完成通知',
        `工单 ${workOrder.work_order_no} 的测量数据已提交，等待审核`,
        'measurement_complete',
        workOrderId
      );
    }

    return success(res, measurement, '测量数据提交成功', 201);
  } catch (err) {
    console.error('submitMeasurement error:', err);
    return error(res, '提交测量数据失败');
  }
}

/**
 * POST /api/v1/measurements/:workOrderId/review - 审核测量结果
 */
async function reviewMeasurement(req, res) {
  try {
    const { workOrderId } = req.params;
    const { action, reason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return error(res, '操作类型无效，必须为 approve 或 reject', 400);
    }
    if (action === 'reject' && !reason) {
      return error(res, '驳回时必须填写原因', 400);
    }

    // 验证工单存在
    const where = ensureWorkOrderOwnership(req, workOrderId);
    const workOrder = await WorkOrder.findOne({ where });
    if (!workOrder) return error(res, '工单不存在', 404);

    // 查找测量记录
    const measurement = await WoMeasurement.findOne({
      where: { work_order_id: workOrderId },
      order: [['id', 'DESC']],
    });

    if (!measurement) return error(res, '测量记录不存在', 404);

    if (action === 'approve') {
      // 通过：工单流转到设计环节
      await workOrder.update({
        current_stage: 'design',
        status: 'measured',
      });
      await measurement.update({ status: 'measured' });

      await createLog(
        workOrderId,
        req.user.user_id,
        'approve_measurement',
        'measurement',
        '测量结果审核通过，流转至设计环节',
        req.ip
      );

      // 通知测量员
      if (measurement.measurer_id) {
        await sendNotification(
          measurement.measurer_id,
          '测量审核通过',
          `工单 ${workOrder.work_order_no} 的测量数据已审核通过`,
          'measurement_approved',
          workOrderId
        );
      }
    } else {
      // 驳回
      await measurement.update({
        status: 'rejected',
        rejection_reason: reason,
      });
      await workOrder.update({
        status: 'rejected',
      });

      await createLog(
        workOrderId,
        req.user.user_id,
        'reject_measurement',
        'measurement',
        `测量结果被驳回：${reason}`,
        req.ip
      );

      // 通知测量员
      if (measurement.measurer_id) {
        await sendNotification(
          measurement.measurer_id,
          '测量审核驳回',
          `工单 ${workOrder.work_order_no} 的测量数据被驳回：${reason}`,
          'measurement_rejected',
          workOrderId
        );
      }
    }

    return success(res, { workOrder, measurement }, action === 'approve' ? '审核通过' : '已驳回');
  } catch (err) {
    console.error('reviewMeasurement error:', err);
    return error(res, '审核失败');
  }
}

/**
 * GET /api/v1/measurements/:workOrderId/history - 同地址历史工单
 */
async function getMeasurementHistory(req, res) {
  try {
    const { workOrderId } = req.params;

    // 获取当前工单
    const currentWhere = ensureWorkOrderOwnership(req, workOrderId);
    const currentOrder = await WorkOrder.findOne({
      where: currentWhere,
      include: [{ model: WoAssignment, as: 'assignment' }],
    });

    if (!currentOrder) return error(res, '工单不存在', 404);

    // 这里基于申报信息中的地址查询，需要关联 declaration
    // 由于 WoDeclaration 可能有地址信息，我们根据当前工单的地址来查历史工单
    // 如果工单本身没有直接地址字段，通过派单/申报信息获取
    // 这里假设通过 assigned_to 和 tenant 来找到相似历史工单
    // 实际应该基于地址匹配，暂时返回同租户已完成的测量工单

    const historyOrders = await WorkOrder.findAll({
      where: {
        id: { [Op.ne]: workOrderId },
        tenant_id: currentOrder.tenant_id,
        status: {
          [Op.in]: ['completed', 'accepted', 'archived', 'measured'],
        },
      },
      include: [
        { model: WoMeasurement, as: 'measurements', limit: 1 },
        { model: WoAssignment, as: 'assignment' },
      ],
      limit: 20,
      order: [['id', 'DESC']],
    });

    return success(res, historyOrders);
  } catch (err) {
    console.error('getMeasurementHistory error:', err);
    return error(res, '获取历史工单失败');
  }
}

module.exports = {
  listAssignments,
  createAssignment,
  getAssignment,
  receiveAssignment,
  listMeasurementTasks,
  getMeasurementTask,
  submitMeasurement,
  reviewMeasurement,
  getMeasurementHistory,
};
