const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const { requireTenant, requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');

// ==================== 设计师工作台 ====================

// GET /api/v1/designs/tasks - 设计师待设计任务列表
router.get('/tasks', requireTenant, injectTenant, designController.getDesignerTasks);

// GET /api/v1/designs/tasks/:workOrderId - 设计任务详情
router.get('/tasks/:workOrderId', requireTenant, injectTenant, designController.getTaskDetail);

// ==================== 设计稿管理 ====================

// GET /api/v1/designs/:workOrderId - 获取设计稿信息
router.get('/:workOrderId', requireAuth, designController.getDesignInfo);

// GET /api/v1/designs/:workOrderId/export - 导出设计报告数据
router.get('/:workOrderId/export', requireAuth, designController.exportDesignReport);

// POST /api/v1/designs/:workOrderId - 上传设计稿
router.post('/:workOrderId', requireTenant, injectTenant, designController.uploadDesign);

// PUT /api/v1/designs/:workOrderId - 修改设计稿（被驳回后重新提交）
router.put('/:workOrderId', requireTenant, injectTenant, designController.updateDesign);

// ==================== 审核 ====================

// POST /api/v1/designs/:workOrderId/review - 审核设计稿（管理员）
router.post('/:workOrderId/review', requireTenant, designController.reviewDesign);

// ==================== 材料清单 ====================

// POST /api/v1/designs/:workOrderId/materials - 材料用量变更
router.post('/:workOrderId/materials', requireTenant, designController.updateMaterials);

module.exports = router;
