const express = require('express');
const router = express.Router();
const faceController = require('../controllers/face.controller');
const { authenticate } = require('../middleware/auth');

// 所有路由需要认证
router.use(authenticate);

// 面配置路由
router.get('/', faceController.getList);
router.get('/:id', faceController.getById);
router.post('/', faceController.create);
router.put('/:id', faceController.update);
router.delete('/:id', faceController.delete);

module.exports = router;
