const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadSingle, uploadArray } = require('../middleware/upload');
const ctrl = require('../controllers/fileController');

// 所有文件路由需要登录
router.use(requireAuth);

// 上传单个文件
router.post('/', uploadSingle, ctrl.uploadFile);

// 批量上传文件（最多 9 个）
router.post('/batch', uploadArray, ctrl.uploadBatch);

// 删除文件
router.delete('/:filename', ctrl.deleteFile);

// GET /api/v1/files 静态文件服务已由 app.js 的 express.static 处理

module.exports = router;
