const express = require('express');
const router = express.Router();
const path = require('path');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');

// 静态文件服务 - 不需要认证
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
router.use('/uploads', express.static(uploadDir));

// 以下路由需要认证
router.use(authenticate);

// 上传单张图片
router.post('/image', uploadController.uploadImage, uploadController.handleError);

// 上传多张图片
router.post('/images', uploadController.uploadImages, uploadController.handleError);

// 上传文件
router.post('/file', uploadController.uploadFile, uploadController.handleError);

// 上传CDR文件
router.post('/cdr', uploadController.uploadCdr, uploadController.handleError);

// 删除文件
router.delete('/:filename', uploadController.deleteFile);

module.exports = router;
