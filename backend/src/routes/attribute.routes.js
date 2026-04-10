const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/attribute.controller');
const { authenticate } = require('../middleware/auth');

// 所有路由需要认证
router.use(authenticate);

// 模板路由
router.get('/templates', attributeController.getTemplates);
router.get('/templates/:id', attributeController.getTemplateById);
router.post('/templates', attributeController.createTemplate);
router.put('/templates/:id', attributeController.updateTemplate);
router.delete('/templates/:id', attributeController.deleteTemplate);

// 字段路由
router.get('/fields', attributeController.getFields);
router.post('/fields', attributeController.createField);
router.put('/fields/:id', attributeController.updateField);
router.delete('/fields/:id', attributeController.deleteField);

module.exports = router;
