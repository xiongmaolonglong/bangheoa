const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/workOrderController');

// 所有工单路由需要登录 + 租户隔离
router.use(requireAuth, injectTenant);

// 创建工单（补录）
router.post('/', controller.createWorkOrder);

// 工单统计（必须在 :id 之前）
router.get('/stats', controller.getWorkOrderStats);

// 工单列表
router.get('/', controller.listWorkOrders);

// 工单操作日志（必须在 :id 之前）
router.get('/:id/logs', controller.getWorkOrderLogs);

// 编辑工单（必须在 :id 之前）
router.put('/:id', controller.updateWorkOrder);

// 删除工单（必须在 :id 之前）
router.delete('/:id', controller.deleteWorkOrder);

// 阶段推进（必须在 :id 之前）
router.put('/:id/advance', controller.advanceWorkOrder);

// 看板拖拽变更（必须在 :id 之前）
router.put('/:id/stage', controller.updateStage);

// 批量推进（必须在 :id 之前）
router.post('/batch-advance', controller.batchAdvance);

// 工单详情
router.get('/:id', controller.getWorkOrder);

module.exports = router;
