const { Op, fn, col } = require('sequelize');
const {
  WorkOrder,
  WorkOrderLog,
  WoDeclaration,
  WoApproval,
  WoAssignment,
  WoMeasurement,
  WoDesign,
  WoProduction,
  WoConstruction,
  WoFinance,
  WoArchive,
  WoAftersale,
  Client,
  ClientUser,
  TenantUser,
} = require('../models');
const { success, error, paginate } = require('../utils/response');
const { generateWorkOrderNo } = require('../services/workOrderNoService');

// ==================== 工具函数 ====================

/** 根据当前环节计算进度百分比 */
const PROGRESS_MAP = {
  declaration: 5, approval: 15, assignment: 25, measurement: 35,
  design: 50, production: 65, construction: 80, finance: 90, archive: 95, aftersale: 100,
};
function calcProgress(stage) {
  return PROGRESS_MAP[stage] || 0;
}

/**
 * 将 Sequelize 返回的工单对象扁平化，方便前端直接使用
 */
function flattenWorkOrder(wo) {
  const obj = typeof wo.toJSON === 'function' ? wo.toJSON() : wo;
  const today = new Date().toISOString().split('T')[0];

  // 展开审批人姓名
  if (obj.approval) {
    obj.approval.approver_name = obj.approval.approver?.name || null;
  }
  // 展开派单信息
  if (obj.assignment) {
    obj.assignment.assigner_name = obj.assignment.assigner?.name || null;
    obj.assignment.assignee_name = obj.assignment.assignee?.name || null;
  }
  // 展开测量员姓名
  if (obj.measurements && obj.measurements.length) {
    obj.measurements.forEach(m => { m.measurer_name = m.measurer?.name || null; });
  }
  // 展开设计人/审核人姓名
  if (obj.designs && obj.designs.length) {
    obj.designs.forEach(d => {
      d.designer_name = d.designer?.name || null;
      d.reviewer_name = d.reviewer?.name || null;
    });
  }
  // 展开施工人姓名
  if (obj.constructions && obj.constructions.length) {
    obj.constructions.forEach(c => { c.constructor_name = c.constructor?.name || null; });
  }
  // 展开归档人姓名
  if (obj.archive) {
    obj.archive.archiver_name = obj.archive.archiver?.name || null;
  }
  // 展开售后处理人姓名和甲方申请人
  if (obj.aftersales && obj.aftersales.length) {
    obj.aftersales.forEach(a => {
      a.handler_name = a.handler?.name || null;
      a.client_name = a.clientRequester?.name || null;
    });
  }

  return {
    ...obj,
    client_name: obj.client?.name || null,
    project_type: obj.declaration?.project_type || null,
    activity_name: obj.activity_name || null,
    address: obj.declaration?.full_address || null,
    contact_name: obj.declaration?.contact_name || null,
    contact_phone: obj.declaration?.contact_phone || null,
    assigned_to: obj.assignment?.assignee_name || obj.assignment?.assignee?.name || null,
    is_timeout: obj.deadline && obj.deadline < today ? true : false,
    progress_percent: calcProgress(obj.current_stage),
    custom_data: obj.custom_data ? JSON.parse(obj.custom_data) : null,
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
async function createLog(workOrderId, user, action, stage, detail, options = {}) {
  return WorkOrderLog.create({
    work_order_id: workOrderId,
    user_id: user.user_id,
    user_type: user.user_type,
    action,
    stage,
    detail,
    ip_address: user._ip || null,
    log_type: options.log_type || null,
    field_name: options.field_name || null,
    old_value: options.old_value || null,
    new_value: options.new_value || null,
    amount_change: options.amount_change || null,
  });
}

// ==================== 工单创建 ====================

/**
 * POST /api/v1/work-orders
 * 广告商后台补录工单（支持动态表单配置）
 */
async function createWorkOrder(req, res) {
  try {
    const {
      title, client_id, client_user_id, project_category, project_type, activity_name,
      address, description, deadline, custom_data
    } = req.body;

    // 动态表单验证：从配置中获取必填字段
    const tenantId = req.tenantId || req.user.tenant_id;

    if (!client_id) {
      return error(res, '请选择甲方企业', 400);
    }

    // 如果未传 title 且有自定义表单配置，从 custom_data 中取
    const formFields = req.body._form_fields || [];
    const hasTitleField = formFields.some(f => f.field_key === 'title');
    if (!title && (!hasTitleField || formFields.find(f => f.field_key === 'title')?.required)) {
      return error(res, '店铺名字不能为空', 400);
    }

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
      title: title || '新工单',
      project_category: project_category || null,
      activity_name: activity_name || null,
      description: description || null,
      current_stage: 'assignment',
      status: 'submitted',
      deadline: deadline || null,
      custom_data: custom_data ? JSON.stringify(custom_data) : null,
    });

    // 地址可能是对象（AddressPicker 解析结果）或字符串
    const addressStr = typeof address === 'object' ? (address.full_address || '') : (address || '');

    // 如果有 project_type 或 address 等申报字段，写入 wo_declarations
    if (project_type || addressStr) {
      const WoDeclaration = require('../models/WoDeclaration');
      await WoDeclaration.create({
        work_order_id: workOrder.id,
        project_type: project_type || null,
        full_address: addressStr || null,
        detail_address: addressStr || null,
      });
    }

    await createLog(workOrder.id, req.user, 'work_order_created', 'assignment',
      `补录工单：${title || '新工单'}`, { log_type: 'create' });

    return success(res, { id: workOrder.id, work_order_no: workOrder.work_order_no }, '工单创建成功', 201);
  } catch (err) {
    console.error('createWorkOrder error:', err);
    // Sequelize 验证错误给友好提示
    if (err.name === 'SequelizeValidationError') {
      return error(res, err.errors.map(e => e.message).join('; '), 400);
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors?.[0]?.path || err.fields?.[0];
      if (field === 'work_order_no') {
        return error(res, '工单号已存在，请重试', 409);
      }
      return error(res, `${field || '字段'}值已存在`, 409);
    }
    return error(res, err.message || '创建工单失败', 500);
  }
}

// ==================== 工单列表 ====================

/**
 * GET /api/v1/work-orders
 * 工单列表（支持筛选+分页+关键词搜索）
 */
async function listWorkOrders(req, res) {
  const { stage, status, client_id, project_category, activity_name, assigned_to, start_date, end_date, page = 1, limit = 20, keyword } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;
  // 默认排除已归档和售后（这两个阶段由归档管理/售后管理页面处理）
  if (stage) {
    where.current_stage = stage;
  } else {
    where.current_stage = { [Op.notIn]: ['archive', 'aftersale'] };
  }
  if (status) where.status = status;
  if (client_id) where.client_id = parseInt(client_id, 10);
  if (project_category) where.project_category = project_category;
  if (activity_name) where.activity_name = activity_name;
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
      {
        model: WoMeasurement,
        as: 'measurements',
        required: false,
        attributes: ['id', 'work_order_id', 'measurer_id', 'materials', 'face_name', 'width', 'height', 'area', 'depth', 'photos', 'notes', 'status', 'measured_at', 'is_proxy'],
        include: [{ model: TenantUser, as: 'measurer', attributes: ['id', 'name'] }],
      },
      {
        model: WoDesign,
        as: 'designs',
        required: false,
        attributes: ['id', 'work_order_id', 'version', 'status', 'effect_images', 'source_files', 'material_list', 'face_mapping'],
        include: [
          { model: TenantUser, as: 'designer', attributes: ['id', 'name'] },
          { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
        ],
      },
      {
        model: WoProduction,
        as: 'productions',
        required: false,
        attributes: ['id', 'work_order_id', 'material_type', 'status'],
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

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return error(res, '无效的工单ID', 400);
  }

  const where = { id: numId };
  if (tenantId) where.tenant_id = tenantId;

  const workOrder = await WorkOrder.findOne({
    where,
    raw: true,
    include: [
      { model: Client, as: 'client', attributes: ['id', 'name'] },
      { model: WoDeclaration, as: 'declaration', required: false },
      { model: WoApproval, as: 'approval', required: false, include: [{ model: ClientUser, as: 'approver', attributes: ['id', 'name'] }] },
      { model: WoAssignment, as: 'assignment', required: false, include: [
        { model: TenantUser, as: 'assigner', attributes: ['id', 'name'] },
        { model: TenantUser, as: 'assignee', attributes: ['id', 'name'] },
      ]},
      { model: WoMeasurement, as: 'measurements', required: false, include: [{ model: TenantUser, as: 'measurer', attributes: ['id', 'name'] }] },
      { model: WoDesign, as: 'designs', required: false, include: [
        { model: TenantUser, as: 'designer', attributes: ['id', 'name'] },
        { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
      ]},
      { model: WoProduction, as: 'productions', required: false },
      { model: WoConstruction, as: 'constructions', required: false, include: [{ model: TenantUser, as: 'constructor', attributes: ['id', 'name'] }] },
    ],
    order: [
      [{ model: WoMeasurement, as: 'measurements' }, 'created_at', 'DESC'],
    ],
  });

  if (!workOrder) {
    return error(res, '工单不存在', 404);
  }

  // 单独查询 hasMany 关联（全部 raw 避免 Sequelize toJSON 崩溃）
  const [productions, finances, archiveRaw, aftersalesRaw, designsRaw] = await Promise.all([
    WoProduction.findAll({ where: { work_order_id: workOrder.id }, raw: true }),
    WoFinance.findAll({ where: { work_order_id: workOrder.id }, raw: true }),
    WoArchive.findOne({ where: { work_order_id: workOrder.id }, raw: true }),
    WoAftersale.findAll({ where: { work_order_id: workOrder.id }, raw: true }),
    WoDesign.findAll({
      where: { work_order_id: workOrder.id },
      include: [
        { model: TenantUser, as: 'designer', attributes: ['id', 'name'] },
        { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
      ],
      raw: true,
      order: [['created_at', 'DESC']],
    }),
  ]);

  // 手动查询关联人
  // 批量查询关联人，避免 N+1
  const neededUserIds = [];
  if (archiveRaw?.archived_by) neededUserIds.push({ id: archiveRaw.archived_by, type: 'tenant' });
  if (aftersalesRaw?.[0]?.handler_id) neededUserIds.push({ id: aftersalesRaw[0].handler_id, type: 'tenant' });
  if (aftersalesRaw?.[0]?.client_user_id) neededUserIds.push({ id: aftersalesRaw[0].client_user_id, type: 'client' });

  const tenantIds = [...new Set(neededUserIds.filter(u => u.type === 'tenant').map(u => u.id))];
  const clientIds = [...new Set(neededUserIds.filter(u => u.type === 'client').map(u => u.id))];

  const [tenantUsers, clientUsers] = await Promise.all([
    tenantIds.length ? TenantUser.findAll({ where: { id: { [Op.in]: tenantIds } }, attributes: ['id', 'name'], raw: true }) : [],
    clientIds.length ? ClientUser.findAll({ where: { id: { [Op.in]: clientIds } }, attributes: ['id', 'name'], raw: true }) : [],
  ]);

  const tMap = {}; for (const u of tenantUsers) tMap[u.id] = u.name;
  const cMap = {}; for (const u of clientUsers) cMap[u.id] = u.name;

  const archiverUserName = archiveRaw?.archived_by ? (tMap[archiveRaw.archived_by] || null) : null;
  const aftersaleHandlerUserName = aftersalesRaw?.[0]?.handler_id ? (tMap[aftersalesRaw[0].handler_id] || null) : null;
  const aftersaleClientUserName = aftersalesRaw?.[0]?.client_user_id ? (cMap[aftersalesRaw[0].client_user_id] || null) : null;

  // 获取操作日志
  const logs = await WorkOrderLog.findAll({ where: { work_order_id: workOrder.id }, raw: true, order: [['created_at', 'DESC']] });

  // 手动构建返回对象
  const result = { ...workOrder };
  result.client_name = workOrder['client.name'] || null;
  result.project_type = workOrder['declaration.project_type'] || null;
  result.address = workOrder['declaration.full_address'] || null;
  result.contact_name = workOrder['declaration.contact_name'] || null;
  result.contact_phone = workOrder['declaration.contact_phone'] || null;

  // 审批
  if (workOrder['approval.id']) {
    result.approval = {
      id: workOrder['approval.id'],
      work_order_id: workOrder['approval.work_order_id'],
      approver_id: workOrder['approval.approver_id'],
      approver_name: workOrder['approval.approver.name'] || null,
      status: workOrder['approval.status'],
      comment: workOrder['approval.comment'],
      approved_at: workOrder['approval.approved_at'],
    };
  }

  // 派单
  if (workOrder['assignment.id']) {
    result.assignment = {
      id: workOrder['assignment.id'],
      work_order_id: workOrder['assignment.work_order_id'],
      assigned_by: workOrder['assignment.assigned_by'],
      assigned_to: workOrder['assignment.assigned_to'],
      assigner_name: workOrder['assignment.assigner.name'] || null,
      assignee_name: workOrder['assignment.assignee.name'] || null,
      status: workOrder['assignment.status'],
      deadline: workOrder['assignment.deadline'],
      notes: workOrder['assignment.notes'],
      assigned_at: workOrder['assignment.createdAt'],
    };
    result.assigned_to = workOrder['assignment.assignee.name'] || null;
  }

  // 测量
  if (workOrder['measurements.id']) {
    const rawBasicInfo = workOrder['measurements.basic_info'];
    const rawMaterials = workOrder['measurements.materials'];
    const measurement = {
      id: workOrder['measurements.id'],
      work_order_id: workOrder['measurements.work_order_id'],
      measurer_id: workOrder['measurements.measurer_id'],
      measurer_name: workOrder['measurements.measurer.name'] || null,
      basic_info: (typeof rawBasicInfo === 'string') ? JSON.parse(rawBasicInfo || '{}') : (rawBasicInfo || {}),
      materials: Array.isArray(rawMaterials) ? rawMaterials : ((typeof rawMaterials === 'string') ? JSON.parse(rawMaterials || '[]') : []),
      face_name: workOrder['measurements.face_name'],
      width: workOrder['measurements.width'],
      height: workOrder['measurements.height'],
      area: workOrder['measurements.area'],
      depth: workOrder['measurements.depth'],
      photos: Array.isArray(workOrder['measurements.photos']) ? workOrder['measurements.photos'] : ((typeof workOrder['measurements.photos'] === 'string') ? JSON.parse(workOrder['measurements.photos'] || '[]') : []),
      notes: workOrder['measurements.notes'],
      signature_path: workOrder['measurements.signature_path'],
      status: workOrder['measurements.status'],
      rejection_reason: workOrder['measurements.rejection_reason'],
      measured_at: workOrder['measurements.measured_at'],
      is_proxy: workOrder['measurements.is_proxy'],
    };
    result.measurements = [measurement];
    result.measurement = measurement;
  } else {
    result.measurements = [];
    result.measurement = null;
  }

  // 设计（单独查询，支持多条）
  const parseJSON = (v) => {
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
    return v || [];
  };
  result.designs = designsRaw.map(d => ({
    id: d.id,
    work_order_id: d.work_order_id,
    designer_id: d.designer_id,
    version: d.version,
    designer_name: d['designer.name'] || null,
    effect_images: parseJSON(d.effect_images),
    source_files: parseJSON(d.source_files),
    material_list: parseJSON(d.material_list),
    face_mapping: parseJSON(d.face_mapping),
    internal_notes: d.internal_notes,
    status: d.status,
    reviewer_id: d.reviewer_id,
    reviewer_name: d['reviewer.name'] || null,
    review_comment: d.review_comment,
    reviewed_at: d.reviewed_at,
    created_at: d.createdAt,
  }));
  result.design_count = result.designs.length;

  // 生产
  result.productions = productions && productions.length ? productions : [];

  // 施工
  if (workOrder['constructions.id']) {
    result.constructions = [{
      id: workOrder['constructions.id'],
      work_order_id: workOrder['constructions.work_order_id'],
      constructor_id: workOrder['constructions.constructor_id'],
      constructor_name: workOrder['constructions.constructor.name'] || null,
      before_photos: workOrder['constructions.before_photos'],
      during_photos: workOrder['constructions.during_photos'],
      after_photos: workOrder['constructions.after_photos'],
      notes: workOrder['constructions.notes'],
      duration_minutes: workOrder['constructions.duration_minutes'],
      signature_path: workOrder['constructions.signature_path'],
      status: workOrder['constructions.status'],
      internal_verified_at: workOrder['constructions.internal_verified_at'],
      client_verified_at: workOrder['constructions.client_verified_at'],
      auto_accept_days: workOrder['constructions.auto_accept_days'],
      constructed_at: workOrder['constructions.constructed_at'],
      created_at: workOrder['constructions.createdAt'],
    }];
  } else {
    result.constructions = [];
  }
  result.construction_count = result.constructions?.length || 0;

  // 结算
  result.finances = finances && finances.length ? finances : [];
  result.finance_summary = result.finances[0] ? {
    quote_amount: result.finances[0].quote_amount,
    budget_used: result.finances[0].budget_used,
    status: result.finances[0].status,
  } : null;

  // 归档
  if (archiveRaw) {
    result.archive = {
      ...archiveRaw,
      archiver_name: archiverUserName,
    };
  } else {
    result.archive = null;
  }

  // 售后
  if (aftersalesRaw && aftersalesRaw.length) {
    result.aftersales = aftersalesRaw.map(a => ({
      ...a,
      handler_name: aftersaleHandlerUserName,
      client_name: aftersaleClientUserName,
    }));
  } else {
    result.aftersales = [];
  }
  result.aftersale_count = result.aftersales?.length || 0;

  // 超时判断
  const today = new Date().toISOString().split('T')[0];
  result.is_timeout = result.deadline && result.deadline < today;
  result.progress_percent = calcProgress(result.current_stage);

  // 解析 custom_data
  if (result.custom_data && typeof result.custom_data === 'string') {
    try { result.custom_data = JSON.parse(result.custom_data); }
    catch { result.custom_data = {}; }
  }

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

/**
 * GET /api/v1/work-orders/trend
 * 近 N 天工单新建/完成趋势
 */
async function getWorkOrderTrend(req, res) {
  const { days = 7 } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days, 10) + 1);
  startDate.setHours(0, 0, 0, 0);

  // 新建工单趋势
  const newCounts = await WorkOrder.findAll({
    where: {
      ...where,
      created_at: { [Op.gte]: startDate },
    },
    attributes: [
      [fn('DATE', col('created_at')), 'date'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [fn('DATE', col('created_at'))],
    raw: true,
  });

  // 完成工单趋势（按 completed_at）
  const completedCounts = await WorkOrder.findAll({
    where: {
      ...where,
      completed_at: { [Op.gte]: startDate },
    },
    attributes: [
      [fn('DATE', col('completed_at')), 'date'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [fn('DATE', col('completed_at'))],
    raw: true,
  });

  // 构建完整日期序列（补 0）
  const dateMap = {};
  for (let i = 0; i < parseInt(days, 10); i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dateMap[dateStr] = { new_count: 0, completed_count: 0 };
  }

  for (const row of newCounts) {
    if (dateMap[row.date]) dateMap[row.date].new_count = parseInt(row.count, 10);
  }
  for (const row of completedCounts) {
    if (dateMap[row.date]) dateMap[row.date].completed_count = parseInt(row.count, 10);
  }

  const result = Object.entries(dateMap).map(([date, counts]) => ({ date, ...counts }));

  return success(res, result);
}

// ==================== 工单更新 ====================

/**
 * PUT /api/v1/work-orders/:id
 * 编辑工单（仅限 assignment 阶段且未派单）
 */
async function updateWorkOrder(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId || req.user.tenant_id;
  const body = req.body;

  const wo = await WorkOrder.findOne({
    where: { id: parseInt(id, 10), tenant_id: tenantId },
  });
  if (!wo) return error(res, '工单不存在', 404);

  if (wo.current_stage !== 'assignment' || wo.assigned_tenant_user_id) {
    return error(res, '该工单已进入后续环节，无法编辑', 400);
  }

  // 更新工单主表字段
  const woFields = ['title', 'project_category', 'description', 'activity_name', 'deadline', 'custom_data'];
  woFields.forEach(key => {
    if (body[key] !== undefined) {
      wo[key] = key === 'custom_data' && typeof body[key] === 'object'
        ? JSON.stringify(body[key])
        : body[key];
    }
  });

  // 更新申报记录字段（address 存在 wo_declarations.full_address 中）
  const WoDeclaration = require('../models/WoDeclaration');
  const decl = await WoDeclaration.findOne({ where: { work_order_id: wo.id } });
  const declFields = ['project_type', 'full_address', 'contact_name', 'contact_phone'];
  if (decl) {
    declFields.forEach(key => {
      if (body[key] !== undefined) decl[key] = body[key];
    });
    await decl.save();
  } else if (body.address || body.project_type) {
    // 无申报记录但传了地址/元素，创建一条
    const addressStr = typeof body.address === 'object' ? (body.address.full_address || '') : (body.address || '');
    await WoDeclaration.create({
      work_order_id: wo.id,
      project_type: body.project_type || null,
      full_address: addressStr || null,
      detail_address: addressStr || null,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || null,
    });
  }

  await wo.save();
  await createLog(wo.id, req.user, 'work_order_updated', 'assignment', '编辑工单信息', { log_type: 'edit' });

  return success(res, flattenWorkOrder(wo), '更新成功');
}

// ==================== 工单删除 ====================

/**
 * DELETE /api/v1/work-orders/:id
 * 软删除工单（已归档的订单不可删除）
 */
async function deleteWorkOrder(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId || req.user.tenant_id;

  const wo = await WorkOrder.findOne({
    where: { id: parseInt(id, 10), tenant_id: tenantId },
  });
  if (!wo) return error(res, '工单不存在', 404);

  if (wo.current_stage === 'archive') {
    return error(res, '已归档的工单不可删除', 400);
  }

  await wo.destroy();
  await createLog(wo.id, req.user, 'work_order_deleted', wo.current_stage, '删除工单', { log_type: 'delete' });

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
  await createLog(wo.id, req.user, 'stage_advanced', target_stage, `推进到${STAGE_LABELS[target_stage]}`, { log_type: 'stage_change' });

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
    `从${STAGE_LABELS[oldStage]}拖拽到${STAGE_LABELS[target_stage]}`,
    { log_type: 'stage_change', field_name: 'current_stage', old_value: oldStage, new_value: target_stage });

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
      `批量从${STAGE_LABELS[oldStage]}到${STAGE_LABELS[target_stage]}`,
      { log_type: 'stage_change' });
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
    raw: true,
  });

  // 批量查询用户名，避免 N+1 问题
  const tenantUserIds = [...new Set(logs.filter(l => l.user_type === 'tenant').map(l => l.user_id))];
  const clientUserIds = [...new Set(logs.filter(l => l.user_type === 'client').map(l => l.user_id))];

  const [tenantUsers, clientUsers] = await Promise.all([
    tenantUserIds.length ? TenantUser.findAll({ where: { id: { [Op.in]: tenantUserIds } }, attributes: ['id', 'name'], raw: true }) : [],
    clientUserIds.length ? ClientUser.findAll({ where: { id: { [Op.in]: clientUserIds } }, attributes: ['id', 'name'], raw: true }) : [],
  ]);

  const tenantNameMap = {};
  for (const u of tenantUsers) tenantNameMap[u.id] = u.name;
  const clientNameMap = {};
  for (const u of clientUsers) clientNameMap[u.id] = u.name;

  for (const log of logs) {
    if (log.user_type === 'super_admin') {
      log.user_name = '超级管理员';
    } else if (log.user_type === 'tenant') {
      log.user_name = tenantNameMap[log.user_id] || '未知';
    } else if (log.user_type === 'client') {
      log.user_name = clientNameMap[log.user_id] || '未知';
    } else {
      log.user_name = '未知';
    }
  }

  return success(res, logs);
}

/**
 * POST /api/v1/work-orders/:id/remark
 * 添加备注
 */
async function addRemark(req, res) {
  const workOrderId = parseInt(req.params.id, 10);
  const { content } = req.body;

  if (!content || !content.trim()) return error(res, '备注内容不能为空', 400);

  const wo = await WorkOrder.findOne({ where: { id: workOrderId, tenant_id: req.tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  const existingRemarks = wo.remarks ? JSON.parse(wo.remarks) : [];
  existingRemarks.push({
    id: Date.now(),
    content: content.trim(),
    user_id: req.user.user_id,
    user_name: req.user.name || req.user.phone,
    created_at: new Date().toISOString(),
  });

  wo.remarks = JSON.stringify(existingRemarks);
  await wo.save();

  await createLog(wo.id, req.user, 'remark_added', wo.current_stage, '添加备注', { log_type: 'remark' });

  return success(res, { remarks: existingRemarks });
}

/**
 * PUT /api/v1/work-orders/:id/assign
 * 转交负责人
 */
async function reassign(req, res) {
  const workOrderId = parseInt(req.params.id, 10);
  const { assigned_to } = req.body;

  if (!assigned_to) return error(res, '请指定负责人', 400);

  const wo = await WorkOrder.findOne({ where: { id: workOrderId, tenant_id: req.tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  const oldAssignee = wo.assigned_tenant_user_id;
  wo.assigned_tenant_user_id = parseInt(assigned_to, 10);
  await wo.save();

  await createLog(wo.id, req.user, 'work_order_reassigned', wo.current_stage,
    `负责人从 ${oldAssignee} 转交到 ${assigned_to}`, { log_type: 'reassign' });

  return success(res, { message: '转交成功' });
}

/**
 * PUT /api/v1/work-orders/:id/tags
 * 更新标签
 */
async function updateTags(req, res) {
  const workOrderId = parseInt(req.params.id, 10);
  const { tags } = req.body;

  if (!Array.isArray(tags)) return error(res, '标签必须是数组', 400);

  const wo = await WorkOrder.findOne({ where: { id: workOrderId, tenant_id: req.tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  const oldTags = wo.custom_tags ? JSON.parse(wo.custom_tags) : [];
  wo.custom_tags = JSON.stringify(tags);
  await wo.save();

  await createLog(wo.id, req.user, 'tags_updated', wo.current_stage,
    `标签从 ${oldTags.join(',')} 改为 ${tags.join(',')}`, { log_type: 'tag_change' });

  return success(res, { tags });
}

/**
 * PUT /api/v1/work-orders/:id/priority
 * 设置优先级
 */
async function updatePriority(req, res) {
  const workOrderId = parseInt(req.params.id, 10);
  const { priority } = req.body;

  if (!['high', 'normal', 'low'].includes(priority)) return error(res, '优先级无效', 400);

  const wo = await WorkOrder.findOne({ where: { id: workOrderId, tenant_id: req.tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  wo.priority = priority;
  await wo.save();

  await createLog(wo.id, req.user, 'priority_updated', wo.current_stage,
    `优先级设为 ${priority}`, { log_type: 'priority_change' });

  return success(res, { priority });
}

/**
 * PUT /api/v1/work-orders/:id/deadline
 * 设置截止日
 */
async function updateDeadline(req, res) {
  const workOrderId = parseInt(req.params.id, 10);
  const { deadline } = req.body;

  const wo = await WorkOrder.findOne({ where: { id: workOrderId, tenant_id: req.tenantId } });
  if (!wo) return error(res, '工单不存在', 404);

  wo.deadline = deadline || null;
  await wo.save();

  await createLog(wo.id, req.user, 'deadline_updated', wo.current_stage,
    `截止日设为 ${deadline || '无'}`, { log_type: 'deadline_change' });

  return success(res, { deadline });
}

/**
 * GET /api/v1/reviews/tasks
 * 审核中心：获取所有待审核项（测量/设计/施工/验收）
 */
async function getReviewTasks(req, res) {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  const tenantId = req.tenantId || req.user.tenant_id;

  // 1. 测量待审核：current_stage = 'measurement' 且 measurements.status = 'measured'
  const measurementTasks = await WorkOrder.findAll({
    where: { current_stage: 'measurement', tenant_id: tenantId },
    include: [
      {
        model: WoMeasurement,
        as: 'measurements',
        where: { status: 'measured' },
        required: true,
        include: [{ model: TenantUser, as: 'measurer', attributes: ['id', 'name'], required: false }],
      },
      { model: Client, as: 'client', attributes: ['id', 'name'] },
    ],
    attributes: ['id', 'work_order_no', 'title', 'client_id', 'deadline'],
    order: [['created_at', 'DESC']],
  });

  // 2. 设计待审核：designs.status = 'reviewing'
  const designTasks = await WoDesign.findAll({
    where: { status: 'reviewing' },
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        where: { tenant_id: tenantId },
        attributes: ['id', 'work_order_no', 'title', 'client_id', 'deadline'],
        include: [
          { model: Client, as: 'client', attributes: ['id', 'name'] },
          { model: WoDeclaration, as: 'declaration', attributes: ['id', 'project_type'], required: false },
        ],
      },
      { model: TenantUser, as: 'designer', attributes: ['id', 'name'], required: false },
    ],
    attributes: ['id', 'version', 'effect_images', 'created_at'],
    order: [['created_at', 'DESC']],
  });

  // 3. 施工待内部验收：constructions.status = 'completed'
  const internalVerifyTasks = await WoConstruction.findAll({
    where: { status: 'completed' },
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        where: { tenant_id: tenantId },
        attributes: ['id', 'work_order_no', 'title', 'client_id', 'deadline'],
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
      },
      { model: TenantUser, as: 'constructor', attributes: ['id', 'name', 'real_name'], required: false },
    ],
    attributes: ['id', 'constructed_at', 'after_photos', 'duration_minutes'],
    order: [['created_at', 'DESC']],
  });

  return success(res, {
    measurements: measurementTasks.map(wo => ({
      work_order_id: wo.id,
      work_order_no: wo.work_order_no,
      title: wo.title,
      client_name: wo.client?.name,
      deadline: wo.deadline,
      measurement: wo.measurements[0],
      measurer_name: wo.measurements[0]?.measurer?.name || '—',
    })),
    designs: designTasks.map(d => {
      let effectImages = d.effect_images;
      if (typeof effectImages === 'string') {
        try { effectImages = JSON.parse(effectImages); } catch { effectImages = []; }
      }
      return {
        work_order_id: d.workOrder?.id,
        work_order_no: d.workOrder?.work_order_no,
        title: d.workOrder?.title,
        client_name: d.workOrder?.client?.name,
        deadline: d.workOrder?.deadline,
        project_type: d.workOrder?.declaration?.project_type || null,
        design_id: d.id,
        version: d.version,
        designer_name: d.designer?.name || '—',
        submitted_at: d.created_at,
        effect_images: effectImages || [],
        has_images: (effectImages?.length || 0) > 0,
      };
    }),
    internalVerifications: internalVerifyTasks.map(c => ({
      work_order_id: c.workOrder?.id,
      work_order_no: c.workOrder?.work_order_no,
      title: c.workOrder?.title,
      client_name: c.workOrder?.client?.name,
      deadline: c.workOrder?.deadline,
      construction_id: c.id,
      constructor_name: c.constructor?.real_name || c.constructor?.name || '—',
      constructed_at: c.constructed_at,
    })),
  });
}

module.exports = {
  createLog,
  createWorkOrder,
  listWorkOrders,
  getWorkOrder,
  getWorkOrderStats,
  getWorkOrderTrend,
  getWorkOrderLogs,
  updateWorkOrder,
  deleteWorkOrder,
  advanceWorkOrder,
  updateStage,
  batchAdvance,
  addRemark,
  reassign,
  updateTags,
  updatePriority,
  updateDeadline,
  getReviewTasks,
};
