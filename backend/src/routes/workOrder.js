const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/workOrderController');

// 所有工单路由需要登录 + 租户隔离
router.use(requireAuth, injectTenant);

// 工单统计（必须在 :id 之前）
router.get('/stats', controller.getWorkOrderStats);

// 工单列表
router.get('/', controller.listWorkOrders);

// 工单详情
router.get('/:id', controller.getWorkOrder);

// 工单操作日志
router.get('/:id/logs', controller.getWorkOrderLogs);

module.exports = router;
