const { Op } = require('sequelize');
const { WoProduction, WorkOrder, WorkOrderLog, TenantUser, WoConstruction, WoMeasurement, WoDesign, WoProductionBatch } = require('../models');
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
  const { status, material_type, work_order_id, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (status) where.status = status;
  if (material_type) where.material_type = material_type;
  if (work_order_id) where.work_order_id = parseInt(work_order_id, 10);

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

  // Ensure task_ids is always an array
  const normalizedRows = rows.map(r => {
    const data = r.toJSON();
    if (typeof data.task_ids === 'string') {
      try { data.task_ids = JSON.parse(data.task_ids); } catch { data.task_ids = []; }
    }
    if (!Array.isArray(data.task_ids)) data.task_ids = [];
    return data;
  });

  return paginate(res, normalizedRows, pagination);
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
 * 任务详情（含关联工单的测量/设计数据）
 */
async function getTask(req, res) {
  const { id } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  // 租户隔离验证
  if (tenantId) {
    const production = await WoProduction.findByPk(id, {
      include: [{ model: WorkOrder, as: 'workOrder', attributes: ['id', 'tenant_id'] }],
    });
    if (!production || production.workOrder?.tenant_id !== tenantId) {
      return error(res, '生产任务不存在', 404);
    }
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

  const data = production.toJSON();
  if (typeof data.task_ids === 'string') {
    try { data.task_ids = JSON.parse(data.task_ids); } catch { data.task_ids = []; }
  }
  if (!Array.isArray(data.task_ids)) data.task_ids = [];

  // 关联工单ID集合（去重）
  const allWoIds = [...new Set([...data.task_ids, data.work_order_id].filter(Boolean))];

  // 批量查询测量数据
  const measurements = await WoMeasurement.findAll({
    where: { work_order_id: { [Op.in]: allWoIds } },
    include: [{ model: TenantUser, as: 'measurer', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
    raw: true,
  });

  // 批量查询设计数据
  const designs = await WoDesign.findAll({
    where: { work_order_id: { [Op.in]: allWoIds } },
    include: [
      { model: TenantUser, as: 'designer', attributes: ['id', 'name'] },
      { model: TenantUser, as: 'reviewer', attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'DESC']],
    raw: true,
  });

  // 按工单ID分组
  const measureByWo = {};
  for (const m of measurements) {
    const woId = m.work_order_id;
    if (!measureByWo[woId]) measureByWo[woId] = [];
    measureByWo[woId].push({
      id: m.id,
      measurer_name: m['measurer.name'] || null,
      basic_info: (typeof m.basic_info === 'string') ? JSON.parse(m.basic_info || '{}') : (m.basic_info || {}),
      materials: Array.isArray(m.materials) ? m.materials : ((typeof m.materials === 'string') ? JSON.parse(m.materials || '[]') : []),
      face_name: m.face_name,
      width: m.width,
      height: m.height,
      area: m.area,
      depth: m.depth,
      photos: Array.isArray(m.photos) ? m.photos : ((typeof m.photos === 'string') ? JSON.parse(m.photos || '[]') : []),
      notes: m.notes,
      status: m.status,
      measured_at: m.measured_at,
    });
  }

  const designByWo = {};
  for (const d of designs) {
    const woId = d.work_order_id;
    if (!designByWo[woId]) designByWo[woId] = [];
    const parseJSON = (v) => {
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
      return v || [];
    };
    designByWo[woId].push({
      id: d.id,
      version: d.version,
      designer_name: d['designer.name'] || null,
      reviewer_name: d['reviewer.name'] || null,
      effect_images: parseJSON(d.effect_images),
      source_files: parseJSON(d.source_files),
      material_list: parseJSON(d.material_list),
      face_mapping: parseJSON(d.face_mapping),
      internal_notes: d.internal_notes,
      status: d.status,
      review_comment: d.review_comment,
      reviewed_at: d.reviewed_at,
      created_at: d.createdAt,
    });
  }

  data.measurements_by_wo = measureByWo;
  data.designs_by_wo = designByWo;

  return success(res, data);
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

  // 如果是 warehoused，工单流转到施工环节，自动创建施工记录
  if (status === 'warehoused') {
    const targetWoIds = [];
    // 合并任务：使用 task_ids
    if (production.task_ids && production.task_ids.length > 0) {
      targetWoIds.push(...production.task_ids);
    }
    // 单个任务：使用 work_order_id
    if (production.work_order_id) {
      targetWoIds.push(production.work_order_id);
    }
    // 去重
    const uniqueWoIds = [...new Set(targetWoIds)];

    if (uniqueWoIds.length > 0) {
      await WorkOrder.update(
        { current_stage: 'construction', status: 'constructing' },
        { where: { id: { [Op.in]: uniqueWoIds } } },
      );

      // 为每个工单自动创建施工记录
      for (const woId of uniqueWoIds) {
        const existing = await WoConstruction.findOne({ where: { work_order_id: woId } });
        if (!existing) {
          await WoConstruction.create({
            work_order_id: woId,
            constructor_id: null, // 待指派施工员
            before_photos: [],
            during_photos: [],
            after_photos: [],
            status: 'scheduled',
          });
        }
        await createLog(woId, req.user, 'production_warehoused', 'construction',
          `生产任务 ${production.production_task_no} 已入库，流转至施工环节`);
      }
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

// ==================== 生产计划（按材料分组待合并任务） ====================

/**
 * GET /api/v1/production/pending-groups
 * 按材料类型分组展示待合并的生产任务
 */
async function getPendingGroups(req, res) {
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = { status: 'scheduled' };
  if (tenantId) {
    const woIds = await WorkOrder.findAll({
      where: { tenant_id: tenantId },
      attributes: ['id'],
      raw: true,
    });
    if (woIds.length === 0) return success(res, { groups: [] });
    where.work_order_id = woIds.map(w => w.id);
  }

  const tasks = await WoProduction.findAll({
    where,
    include: [
      {
        model: WorkOrder,
        as: 'workOrder',
        attributes: ['id', 'work_order_no', 'title', 'current_stage'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
  });

  // 按材料类型分组
  const groupMap = {};
  for (const task of tasks) {
    const key = task.material_type || '未分类';
    if (!groupMap[key]) {
      groupMap[key] = {
        material_type: key,
        spec: task.spec || '',
        count: 0,
        totalQuantity: 0,
        tasks: [],
        suggestedMerge: false,
      };
    }
    groupMap[key].count++;
    groupMap[key].totalQuantity += (task.quantity || 0);
    if (!groupMap[key].spec && task.spec) groupMap[key].spec = task.spec;
    groupMap[key].tasks.push({
      id: task.id,
      production_task_no: task.production_task_no,
      spec: task.spec,
      quantity: task.quantity,
      work_order_id: task.work_order_id,
      workOrder: task.workOrder,
      created_at: task.created_at,
    });
  }

  const groups = Object.values(groupMap).map(g => {
    g.suggestedMerge = g.count >= 2;
    return g;
  });

  // 按任务数排序，建议合并的优先
  groups.sort((a, b) => {
    if (a.suggestedMerge && !b.suggestedMerge) return -1;
    if (!a.suggestedMerge && b.suggestedMerge) return 1;
    return b.count - a.count;
  });

  return success(res, { groups });
}

// ==================== 合并已有生产任务 ====================

/**
 * POST /api/v1/production/tasks/:id/merge
 * 将多个生产任务合并为一个
 * 请求体: { task_ids: [1, 2, 3] } — 生产任务ID列表
 */
async function mergeExistingTasks(req, res) {
  const { task_ids: taskIds } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length < 2) {
    return error(res, '需要至少 2 个生产任务才能合并', 400);
  }

  // 查询所有待合并的任务
  const tasks = await WoProduction.findAll({
    where: { id: { [Op.in]: taskIds } },
    include: [{ model: WorkOrder, as: 'workOrder', attributes: ['id', 'tenant_id'] }],
  });

  if (tasks.length < 2) return error(res, '部分生产任务不存在', 404);

  // 验证租户隔离
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);
  if (tenantId) {
    for (const task of tasks) {
      if (task.workOrder?.tenant_id !== tenantId) return error(res, '无权操作', 403);
    }
  }

  // 收集所有关联工单（去重）
  const allWorkOrderIds = new Set();
  const materialType = tasks[0].material_type || '未分类';
  let spec = '';
  let totalQuantity = 0;

  for (const task of tasks) {
    if (task.work_order_id) allWorkOrderIds.add(task.work_order_id);
    if (task.task_ids && Array.isArray(task.task_ids)) {
      task.task_ids.forEach(id => allWorkOrderIds.add(id));
    }
    if (!spec && task.spec) spec = task.spec;
    totalQuantity += (task.quantity || 0);
  }

  // 创建合并后的新生产任务
  const newTask = await WoProduction.create({
    work_order_id: tasks[0].work_order_id,
    production_task_no: generateProductionTaskNo(),
    task_ids: Array.from(allWorkOrderIds),
    material_type: materialType,
    spec: spec || null,
    quantity: totalQuantity || 0,
    status: 'scheduled',
  });

  // 软删除原任务
  for (const task of tasks) {
    await task.destroy();
  }

  // 记录日志
  for (const woId of allWorkOrderIds) {
    await createLog(woId, req.user, 'production_merged', 'production',
      `已合并到生产任务 ${newTask.production_task_no}`);
  }

  return success(res, newTask, `已合并 ${tasks.length} 个生产任务`);
}

// ==================== 生产批次 ====================

/**
 * 生成批次号
 * 格式: PB-YYYYMMDD-XXXX
 */
function generateBatchNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PB-${dateStr}-${random}`;
}

/**
 * POST /api/v1/production/batches
 * 创建生产批次（工厂核对完成）
 * 请求体: { material_type, items: [{ work_order_id, checked: true/false }]?, notes }
 */
async function createBatch(req, res) {
  const { material_type, items, notes } = req.body;

  if (!material_type) return error(res, '材料类型不能为空', 400);
  if (!items || !Array.isArray(items) || items.length === 0) return error(res, '工单明细不能为空', 400);

  const tenantId = req.tenantId || req.user.tenant_id;
  const creatorId = req.user.user_id;

  // 验证工单属于当前租户（去重，因为同一工单可能有多个材料组）
  const woIds = [...new Set(items.map(i => i.work_order_id))];
  const workOrders = await WorkOrder.findAll({
    where: { id: { [Op.in]: woIds }, tenant_id: tenantId },
    attributes: ['id', 'work_order_no', 'title', 'current_stage'],
    raw: true,
  });
  if (workOrders.length !== woIds.length) return error(res, '部分工单不存在或无权操作', 404);

  const woMap = {};
  workOrders.forEach(wo => { woMap[wo.id] = wo; });

  // 构建核对清单（包含材料组信息）
  const checklist = items.map(item => ({
    work_order_id: item.work_order_id,
    work_order_no: woMap[item.work_order_id]?.work_order_no || '',
    title: woMap[item.work_order_id]?.title || '',
    checked: !!item.checked,
    group_name: item.group_name || '',
    is_unified: item.is_unified || false,
    group_index: item.group_index,
    material_type: item.material_type,
  }));

  const completedCount = checklist.filter(i => i.checked).length;
  if (completedCount === 0) return error(res, '请至少勾选一个已完成的工单', 400);

  const batchNo = generateBatchNo();
  const batch = await WoProductionBatch.create({
    batch_no: batchNo,
    material_type,
    tenant_id: tenantId,
    creator_id: creatorId,
    creator_name: req.user.name || '',
    checklist,
    total_count: checklist.length,
    completed_count: completedCount,
    notes: notes || null,
  });

  // 将已勾选的材料组标记完成，判断工单是否所有材料都完成才流转
  const checkedItems = checklist.filter(i => i.checked);
  const uniqueCompletedWoIds = [...new Set(checkedItems.map(i => i.work_order_id))];

  if (uniqueCompletedWoIds.length > 0) {
    // 更新生产任务状态（按材料类型+工单精确匹配）
    for (const item of checkedItems) {
      await WoProduction.update(
        { status: 'completed' },
        { where: { work_order_id: item.work_order_id, material_type: item.material_type } }
      );
    }

    // 检查每个工单是否所有材料都已完成，是则流转到施工
    for (const woId of uniqueCompletedWoIds) {
      const remaining = await WoProduction.count({
        where: { work_order_id: woId, status: { [Op.ne]: 'completed' } },
      });
      if (remaining === 0) {
        await WorkOrder.update(
          { current_stage: 'construction', status: 'constructing' },
          { where: { id: woId } },
        );
        const existing = await WoConstruction.findOne({ where: { work_order_id: woId } });
        if (!existing) {
          await WoConstruction.create({
            work_order_id: woId,
            constructor_id: null,
            before_photos: [],
            during_photos: [],
            after_photos: [],
            status: 'scheduled',
          });
        }
        await createLog(woId, req.user, 'production_completed', 'construction',
          `生产批次 ${batchNo} 已完成，流转至施工环节`);
      } else {
        await createLog(woId, req.user, 'production_partial_completed', 'production',
          `生产批次 ${batchNo} 部分材料完成，剩余 ${remaining} 项未完成`);
      }
    }
  }

  return success(res, { batch, completedCount, totalCount: checklist.length }, '生产批次创建成功');
}

/**
 * GET /api/v1/production/batches
 * 生产批次列表
 * 筛选: ?material_type=&page=&limit=
 */
async function listBatches(req, res) {
  const { material_type, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = {};
  if (tenantId) where.tenant_id = tenantId;
  if (material_type) where.material_type = material_type;

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageSize = Math.min(Math.max(1, parseInt(limit, 10)), 100);

  const { count, rows } = await WoProductionBatch.findAndCountAll({
    where,
    include: [{ model: TenantUser, as: 'creator', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset,
  });

  return paginate(res, rows, {
    page: parseInt(page, 10),
    limit: pageSize,
    total: count,
    pages: Math.ceil(count / pageSize),
  });
}

/**
 * GET /api/v1/production/batches/:id
 * 批次详情
 */
async function getBatch(req, res) {
  const { id } = req.params;
  const tenantId = req.user.role === 'super_admin' ? undefined : (req.tenantId || req.user.tenant_id);

  const where = { id: parseInt(id, 10) };
  if (tenantId) where.tenant_id = tenantId;

  const batch = await WoProductionBatch.findOne({
    where,
    include: [{ model: TenantUser, as: 'creator', attributes: ['id', 'name'] }],
  });

  if (!batch) return error(res, '批次不存在', 404);
  return success(res, batch);
}

module.exports = {
  listTasks,
  mergeTasks,
  getTask,
  updateStatus,
  materialPickup,
  getPendingGroups,
  mergeExistingTasks,
  // 批次相关
  createBatch,
  listBatches,
  getBatch,
};
