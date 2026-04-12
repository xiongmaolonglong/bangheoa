const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/constructionController');

// 所有施工路由需要登录 + 租户隔离
router.use(requireAuth, injectTenant);

// 施工任务列表
router.get('/tasks', controller.listTasks);

// 施工任务详情（必须在 :workOrderId 之前定义具体路径）
router.get('/tasks/:workOrderId', controller.getTask);

// 提交施工记录
router.post('/:workOrderId', controller.submitConstruction);

// 内部验收
router.post('/:workOrderId/internal-verify', controller.internalVerify);

// 甲方验收
router.post('/:workOrderId/verify', controller.clientVerify);

// 施工异常上报
router.post('/:workOrderId/exception', controller.reportException);

module.exports = router;
