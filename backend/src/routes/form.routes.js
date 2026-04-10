const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有路由需要认证
router.use(authenticate);

// 获取完整表单配置（所有登录用户可访问）
router.get('/config', formController.getConfig);

// 分组管理 - 仅管理员
router.get('/groups', authorize(['admin']), formController.getGroups);
router.post('/groups', authorize(['admin']), formController.createGroup);
router.put('/groups/:id', authorize(['admin']), formController.updateGroup);
router.delete('/groups/:id', authorize(['admin']), formController.deleteGroup);

// 字段管理 - 仅管理员
router.get('/fields', authorize(['admin']), formController.getFields);
router.post('/fields', authorize(['admin']), formController.createField);
router.put('/fields/:id', authorize(['admin']), formController.updateField);
router.delete('/fields/:id', authorize(['admin']), formController.deleteField);

// 批量更新排序
router.put('/fields/sort', authorize(['admin']), formController.updateSort);

// 功能开关 - 仅管理员
router.get('/features', authorize(['admin']), formController.getFeatures);
router.put('/features', authorize(['admin']), formController.saveFeatures);

module.exports = router;
