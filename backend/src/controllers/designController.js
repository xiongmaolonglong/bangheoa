const { Op } = require('sequelize');
const {
  WorkOrder,
  WoDesign,
  WoMeasurement,
  WorkOrderLog,
  Notification,
  TenantUser,
} = require('../models');
const { createLog } = require('./workOrderController');
const { success, error, paginate } = require('../utils/response');
const { injectTenant } = require('../middleware/tenant');

// ==================== 设计师待设计任务列表 ====================

/**
 * GET /api/v1/designs/tasks
 * 设计师待设计任务列表（status=designing）
 */
async function getDesignerTasks(req, res) {
  const { status = 'designing', page = 1, limit = 20 } = req.query;

  // 当前设计师
  const designerId = req.user.user_id;

  // 查工单：分配给当前设计师，处于设计阶段
  const where = {
    assigned_tenant_user_id: designerId,
    current_stage: 'design',
  };

  if (status) where.status = status;

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageSize = Math.min(Math.max(1, parseInt(limit, 10)), 100);

  const { count, rows } = await WorkOrder.findAndCountAll({
    where,
    include: [
      {
        model: WoMeasurement,
        as: 'measurements',
        required: false,
        attributes: ['id', 'face_name', 'width', 'height', 'area', 'photos'],
      },
    ],
    attributes: [
      'id', 'work_order_no', 'title', 'status', 'current_stage',
      'deadline', 'created_at',
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

// ==================== 设计任务详情 ====================

/**
 * GET /api/v1/designs/tasks/:workOrderId
 * 设计任务详情（工单信息 + 测量数据）
 */
async function getTaskDetail(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);
  const designerId = req.user.user_id;

  const workOrder = await WorkOrder.findOne({
    where: {
      id: workOrderId,
      assigned_tenant_user_id: designerId,
    },
    include: [
      {
        model: WoMeasurement,
        as: 'measurements',
        required: false,
        attributes: [
          'id', 'face_name', 'width', 'height', 'area', 'depth',
          'photos', 'notes', 'created_at',
        ],
      },
      {
        model: WoDesign,
        as: 'designs',
        required: false,
      },
    ],
  });

  if (!workOrder) {
    return error(res, '任务不存在或无权访问', 404);
  }

  return success(res, workOrder);
}

// ==================== 上传设计稿 ====================

/**
 * POST /api/v1/designs/:workOrderId
 * 上传设计稿
 */
async function uploadDesign(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);
  const {
    effect_images,
    source_files,
    material_list,
    face_mapping,
    internal_notes,
  } = req.body;

  if (!effect_images || !Array.isArray(effect_images)) {
    return error(res, '效果图不能为空', 400);
  }

  // 校验工单存在且可操作
  const workOrder = await WorkOrder.findByPk(workOrderId);
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  if (workOrder.current_stage !== 'design' && workOrder.status !== 'designing') {
    return error(res, '当前工单不在设计阶段，无法上传设计', 400);
  }

  const designerId = req.user.user_id;

  // 创建或更新设计记录（每个工单一条设计记录）
  const existing = await WoDesign.findOne({ where: { work_order_id: workOrderId } });

  let design;
  if (existing) {
    await existing.update({
      effect_images,
      source_files: source_files || [],
      material_list: material_list || [],
      face_mapping: face_mapping || [],
      internal_notes: internal_notes || null,
      status: 'reviewing',
    });
    design = existing;
  } else {
    design = await WoDesign.create({
      work_order_id: workOrderId,
      designer_id: designerId,
      effect_images,
      source_files: source_files || [],
      material_list: material_list || [],
      face_mapping: face_mapping || [],
      internal_notes: internal_notes || null,
      status: 'reviewing',
    });
  }

  // 更新工单
  await workOrder.update({
    current_stage: 'design',
    status: 'designing',
  });

  // 记录日志
  await createLog(workOrderId, req.user, 'design_upload', 'design', '上传设计稿');

  return success(res, design, '设计稿上传成功');
}

// ==================== 获取设计稿信息 ====================

/**
 * GET /api/v1/designs/:workOrderId
 * 获取设计稿信息
 */
async function getDesignInfo(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);

  const design = await WoDesign.findOne({
    where: { work_order_id: workOrderId },
    include: [
      { model: TenantUser, as: 'designer', attributes: ['id', 'name', 'phone'] },
      { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
    ],
  });

  if (!design) {
    return error(res, '设计稿不存在', 404);
  }

  return success(res, design);
}

// ==================== 审核设计稿 ====================

/**
 * POST /api/v1/designs/:workOrderId/review
 * 审核设计稿（管理员）
 */
async function reviewDesign(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);
  const { action, comment } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return error(res, '审核操作必须为 approve 或 reject', 400);
  }

  const design = await WoDesign.findOne({ where: { work_order_id: workOrderId } });
  if (!design) {
    return error(res, '设计稿不存在', 404);
  }

  const workOrder = await WorkOrder.findByPk(workOrderId);
  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const reviewerId = req.user.user_id;
  const now = new Date();

  if (action === 'approve') {
    // 审核通过
    await design.update({
      status: 'approved',
      reviewer_id: reviewerId,
      review_comment: comment || null,
      reviewed_at: now,
    });

    // 工单进入生产环节
    await workOrder.update({
      current_stage: 'production',
      status: 'measured',
    });

    await createLog(workOrderId, req.user, 'design_approve', 'design', comment || '设计审核通过');
  } else {
    // 审核驳回
    await design.update({
      status: 'rejected',
      reviewer_id: reviewerId,
      review_comment: comment || null,
      reviewed_at: now,
    });

    // 工单保持 designing 状态（退回设计师修改）
    await workOrder.update({
      current_stage: 'design',
      status: 'designing',
    });

    await createLog(workOrderId, req.user, 'design_reject', 'design', comment || '设计审核驳回');

    // 通知设计师
    await Notification.create({
      user_id: design.designer_id,
      user_type: 'tenant',
      title: '设计稿被驳回',
      content: `工单 ${workOrder.work_order_no} 的设计稿已被驳回${comment ? '，原因：' + comment : ''}`,
      type: 'design_rejected',
      work_order_id: workOrderId,
    });
  }

  const updated = await WoDesign.findByPk(design.id);
  return success(res, updated, action === 'approve' ? '审核通过' : '审核驳回');
}

// ==================== 修改设计稿 ====================

/**
 * PUT /api/v1/designs/:workOrderId
 * 修改设计稿（被驳回后重新提交）
 */
async function updateDesign(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);
  const {
    effect_images,
    source_files,
    material_list,
    face_mapping,
    internal_notes,
  } = req.body;

  const design = await WoDesign.findOne({ where: { work_order_id: workOrderId } });
  if (!design) {
    return error(res, '设计稿不存在', 404);
  }

  if (design.status !== 'rejected') {
    return error(res, '只能修改被驳回的设计稿', 400);
  }

  await design.update({
    effect_images: effect_images || design.effect_images,
    source_files: source_files !== undefined ? source_files : design.source_files,
    material_list: material_list !== undefined ? material_list : design.material_list,
    face_mapping: face_mapping !== undefined ? face_mapping : design.face_mapping,
    internal_notes: internal_notes !== undefined ? internal_notes : design.internal_notes,
    status: 'reviewing',
    review_comment: null,
    reviewed_at: null,
  });

  // 工单保持设计阶段
  const workOrder = await WorkOrder.findByPk(workOrderId);
  if (workOrder) {
    await workOrder.update({
      current_stage: 'design',
      status: 'designing',
    });
  }

  await createLog(workOrderId, req.user, 'design_update', 'design', '修改并重新提交设计稿');

  return success(res, design, '设计稿已重新提交');
}

// ==================== 材料清单变更 ====================

/**
 * POST /api/v1/designs/:workOrderId/materials
 * 修改材料用量
 */
async function updateMaterials(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);
  const { changes } = req.body;

  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return error(res, '材料变更数据不能为空', 400);
  }

  const design = await WoDesign.findOne({ where: { work_order_id: workOrderId } });
  if (!design) {
    return error(res, '设计稿不存在', 404);
  }

  if (!design.material_list || !Array.isArray(design.material_list)) {
    return error(res, '当前无材料清单', 400);
  }

  const materialList = design.material_list.map((item) => {
    // 查找匹配的变更
    const change = changes.find(
      (c) => c.material_type === item.material_type
    );
    if (change) {
      return {
        ...item,
        confirmed_qty: change.new_qty,
        notes: change.reason || item.notes || '',
        _change_record: {
          old_qty: change.old_qty,
          new_qty: change.new_qty,
          reason: change.reason,
          changed_at: new Date().toISOString(),
          changed_by: req.user.user_id,
        },
      };
    }
    return item;
  });

  await design.update({ material_list });

  // 记录材料变更日志
  const changeSummary = changes
    .map((c) => `${c.material_type}: ${c.old_qty} -> ${c.new_qty} (${c.reason || ''})`)
    .join('; ');

  await createLog(workOrderId, req.user, 'material_change', 'design', `材料变更: ${changeSummary}`);

  return success(res, design, '材料用量已更新');
}

// ==================== 导出设计报告数据 ====================

/**
 * GET /api/v1/designs/:workOrderId/export
 * 获取设计报告数据（用于前端生成 PDF）
 */
async function exportDesignReport(req, res) {
  const workOrderId = parseInt(req.params.workOrderId, 10);

  const workOrder = await WorkOrder.findByPk(workOrderId, {
    attributes: [
      'id', 'work_order_no', 'title', 'project_category',
      'description', 'status', 'current_stage', 'deadline',
      'created_at', 'completed_at',
    ],
  });

  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  const design = await WoDesign.findOne({
    where: { work_order_id: workOrderId },
    include: [
      { model: TenantUser, as: 'designer', attributes: ['id', 'name', 'phone'] },
      { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
    ],
  });

  const measurements = await WoMeasurement.findAll({
    where: { work_order_id: workOrderId },
    attributes: ['id', 'face_name', 'width', 'height', 'area', 'depth', 'photos', 'notes', 'created_at'],
    order: [['created_at', 'ASC']],
  });

  const report = {
    work_order: {
      work_order_no: workOrder.work_order_no,
      title: workOrder.title,
      project_category: workOrder.project_category,
      description: workOrder.description,
      status: workOrder.status,
      current_stage: workOrder.current_stage,
      deadline: workOrder.deadline,
      created_at: workOrder.created_at,
    },
    measurements: measurements.map((m) => ({
      face_name: m.face_name,
      width: m.width,
      height: m.height,
      area: m.area,
      depth: m.depth,
      photos: m.photos,
      notes: m.notes,
    })),
    design: design
      ? {
          designer_name: design.designer?.name || null,
          reviewer_name: design.reviewer?.name || null,
          effect_images: design.effect_images,
          source_files: design.source_files,
          material_list: design.material_list,
          face_mapping: design.face_mapping,
          internal_notes: design.internal_notes,
          status: design.status,
          review_comment: design.review_comment,
          reviewed_at: design.reviewed_at,
        }
      : null,
  };

  return success(res, report);
}

module.exports = {
  getDesignerTasks,
  getTaskDetail,
  uploadDesign,
  getDesignInfo,
  reviewDesign,
  updateDesign,
  updateMaterials,
  exportDesignReport,
};
