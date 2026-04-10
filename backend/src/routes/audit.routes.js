/**
 * 审计日志路由
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// 所有审计路由需要管理员权限
router.use(authMiddleware);
router.use(checkPermission(['admin']));

// 获取审计日志列表
router.get('/', auditController.list);

// 获取用户操作统计
router.get('/user-stats', auditController.userStats);

// 导出审计日志
router.get('/export', auditController.export);

module.exports = router;