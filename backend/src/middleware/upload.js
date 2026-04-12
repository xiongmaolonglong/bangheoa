const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * 允许的 MIME 类型扩展
 */
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif',
  'pdf', 'cdr',
  'doc', 'docx',
  'xls', 'xlsx',
]);

/**
 * 文件大小限制（字节）
 * 图片: 10MB, 其他: 50MB
 */
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;     // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;      // 50MB

/**
 * 生成安全的文件名: {timestamp}-{random}.{ext}
 */
function generateFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase().slice(1);
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}.${ext}`;
}

/**
 * multer storage 配置 - 按租户和工单组织目录
 */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const tenantId = req.user?.tenant_id || req.body?.tenant_id || 'default';
    const workOrderId = req.body?.work_order_id || 'general';
    const uploadDir = path.join(
      __dirname, '..', '..', 'uploads',
      String(tenantId),
      String(workOrderId)
    );
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const filename = generateFilename(file.originalname);
    req.savedFilename = filename; // 传递给 controller 使用
    cb(null, filename);
  },
});

/**
 * 文件过滤器 - 按扩展名限制
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError(
      'LIMIT_UNEXPECTED_FILE',
      `不支持的文件类型: .${ext}，允许: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    ));
  }
}

/**
 * 基础 multer 实例（带 fileFilter 和 storage）
 * limits 在路由层根据文件类型动态设置
 */
const upload = multer({
  storage,
  fileFilter,
});

/**
 * 单文件上传中间件
 */
function uploadSingle(req, res, next) {
  // 根据扩展名动态设置大小限制
  const originalExt = req.file ? path.extname(req.file.originalname).toLowerCase().slice(1) : null;
  const maxFileSize = originalExt && IMAGE_EXTENSIONS.has(originalExt) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  const uploadWithLimits = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSize },
  }).single('file');

  uploadWithLimits(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
}

/**
 * 多文件上传中间件（最多 9 个）
 */
function uploadArray(req, res, next) {
  const uploadWithLimits = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).array('files', 9);

  uploadWithLimits(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
}

/**
 * 构建文件 URL
 */
function buildFileUrl(tenantId, workOrderId, filename) {
  return `/uploads/${tenantId}/${workOrderId}/${filename}`;
}

module.exports = {
  uploadSingle,
  uploadArray,
  buildFileUrl,
  ALLOWED_EXTENSIONS,
};
