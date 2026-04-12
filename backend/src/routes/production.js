const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/productionController');

// 所有生产路由需要登录 + 租户隔离
router.use(requireAuth, injectTenant);

// 合并创建生产任务（必须在 :id 之前）
router.post('/tasks/merge', controller.mergeTasks);

// 工厂领料登记
router.post('/material-pickup', controller.materialPickup);

// 生产任务列表
router.get('/tasks', controller.listTasks);

// 生产任务详情
router.get('/tasks/:id', controller.getTask);

// 更新生产状态
router.post('/tasks/:id/status', controller.updateStatus);

module.exports = router;
