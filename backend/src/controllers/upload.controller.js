const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const response = require('../utils/response');
const sharp = require('sharp');

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 允许的文件类型配置
const ALLOWED_TYPES = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'cdr'],
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/cdr'
    ],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  archive: {
    extensions: ['zip', 'rar'],
    mimes: ['application/zip', 'application/x-rar-compressed'],
    maxSize: 100 * 1024 * 1024 // 100MB
  }
};

// 获取文件类型
function getFileType(mimetype, ext) {
  for (const [type, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.mimes.includes(mimetype) || config.extensions.includes(ext)) {
      return type;
    }
  }
  return null;
}

// 验证文件签名（防止伪造扩展名）
async function validateFileSignature(filePath, mimetype) {
  const buffer = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 8, 0);
  fs.closeSync(fd);

  const signatures = {
    'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
    'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
    'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
    'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])]
  };

  const expectedSigs = signatures[mimetype];
  if (!expectedSigs) return true; // 未配置签名的类型跳过检查

  return expectedSigs.some(sig => buffer.slice(0, sig.length).equals(sig));
}

// 图片压缩处理
async function processImage(filePath, options = {}) {
  const { maxWidth = 1920, maxHeight = 1080, quality = 85 } = options;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // 只处理大图
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      await image
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality, mozjpeg: true })
        .toFile(filePath + '.tmp');

      // 替换原文件
      fs.unlinkSync(filePath);
      fs.renameSync(filePath + '.tmp', filePath);

      return { compressed: true };
    }

    return { compressed: false };
  } catch (err) {
    logger.error('图片处理失败:', err);
    return { compressed: false, error: err.message };
  }
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按日期和类型创建子目录
    const dateStr = new Date().toISOString().slice(0, 10);
    const typeDir = file.mimetype.startsWith('image/') ? 'images' : 'files';
    const targetDir = path.join(uploadDir, typeDir, dateStr);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // 安全的文件名（防止路径遍历）
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      .substring(0, 50);
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${safeName}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mimetype = file.mimetype;

  // 检查文件类型
  const fileType = getFileType(mimetype, ext);
  if (!fileType) {
    return cb(new Error(`不支持的文件类型: ${ext}`), false);
  }

  // 检查扩展名和MIME类型是否匹配
  const config = ALLOWED_TYPES[fileType];
  if (!config.extensions.includes(ext) && !config.mimes.includes(mimetype)) {
    return cb(new Error('文件扩展名与内容不匹配'), false);
  }

  cb(null, true);
};

// 创建 multer 实例
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 默认最大 100MB
    files: 20 // 最多 20 个文件
  }
});

/**
 * 上传控制器（安全增强版）
 */
const uploadController = {
  /**
   * 上传单张图片（带压缩）
   */
  uploadImage: [
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return response.error(res, '请选择要上传的图片');
        }

        // 验证文件签名
        const isValid = await validateFileSignature(req.file.path, req.file.mimetype);
        if (!isValid) {
          fs.unlinkSync(req.file.path);
          return response.error(res, '文件内容与类型不匹配');
        }

        // 压缩图片
        const processResult = await processImage(req.file.path);

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileUrl = `/uploads/images/${dateStr}/${req.file.filename}`;

        // 获取压缩后的文件大小
        const stats = fs.statSync(req.file.path);

        return response.success(res, {
          url: fileUrl,
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: stats.size,
          originalSize: req.file.size,
          compressed: processResult.compressed
        });
      } catch (error) {
        logger.error('上传图片错误:', error);
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return response.error(res, '上传图片失败');
      }
    }
  ],

  /**
   * 上传多个图片（带压缩）
   */
  uploadImages: [
    upload.array('files', 10),
    async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return response.error(res, '请选择要上传的图片');
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const files = [];

        for (const file of req.files) {
          // 验证文件签名
          const isValid = await validateFileSignature(file.path, file.mimetype);
          if (!isValid) {
            fs.unlinkSync(file.path);
            continue;
          }

          // 压缩图片
          await processImage(file.path);

          const stats = fs.statSync(file.path);
          files.push({
            url: `/uploads/images/${dateStr}/${file.filename}`,
            filename: file.filename,
            originalname: file.originalname,
            size: stats.size,
            originalSize: file.size
          });
        }

        if (files.length === 0) {
          return response.error(res, '所有文件验证失败');
        }

        return response.success(res, files);
      } catch (error) {
        logger.error('上传图片错误:', error);
        // 清理所有文件
        if (req.files) {
          req.files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          });
        }
        return response.error(res, '上传图片失败');
      }
    }
  ],

  /**
   * 上传单个文件
   */
  uploadFile: [
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return response.error(res, '请选择要上传的文件');
        }

        // 验证文件大小限制
        const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
        const fileType = getFileType(req.file.mimetype, ext);
        const config = ALLOWED_TYPES[fileType];

        if (req.file.size > config.maxSize) {
          fs.unlinkSync(req.file.path);
          return response.error(res, `文件大小超过限制（最大${Math.round(config.maxSize / 1024 / 1024)}MB）`);
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileUrl = `/uploads/files/${dateStr}/${req.file.filename}`;

        return response.success(res, {
          url: fileUrl,
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      } catch (error) {
        logger.error('上传文件错误:', error);
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return response.error(res, '上传文件失败');
      }
    }
  ],

  /**
   * 上传CDR文件
   */
  uploadCdr: [
    upload.single('file'),
    (req, res) => {
      try {
        if (!req.file) {
          return response.error(res, '请选择要上传的CDR文件');
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.cdr') {
          fs.unlinkSync(req.file.path);
          return response.error(res, '只支持 .cdr 格式的文件');
        }

        if (req.file.size > 100 * 1024 * 1024) {
          fs.unlinkSync(req.file.path);
          return response.error(res, '文件大小超过限制（最大100MB）');
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileUrl = `/uploads/files/${dateStr}/${req.file.filename}`;

        return response.success(res, {
          url: fileUrl,
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size
        });
      } catch (error) {
        logger.error('上传CDR文件错误:', error);
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return response.error(res, '上传CDR文件失败');
      }
    }
  ],

  /**
   * 删除文件
   */
  deleteFile: async (req, res) => {
    try {
      const { filename } = req.params;

      if (!filename) {
        return response.error(res, '文件名不能为空');
      }

      // 安全检查：防止路径遍历攻击
      const safeName = path.basename(filename);

      // 在上传目录中递归查找文件
      const findFile = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const found = findFile(fullPath);
            if (found) return found;
          } else if (item === safeName) {
            return fullPath;
          }
        }
        return null;
      };

      const filePath = findFile(uploadDir);

      if (!filePath) {
        return response.notFound(res, '文件不存在');
      }

      // 安全检查：确保文件在上传目录内
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        return response.error(res, '非法的文件路径');
      }

      fs.unlinkSync(filePath);
      return response.success(res, null, '删除成功');
    } catch (error) {
      logger.error('删除文件错误:', error);
      return response.error(res, '删除文件失败');
    }
  },

  /**
   * 错误处理中间件
   */
  handleError: (err, req, res, next) => {
    // 清理已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return response.error(res, '文件大小超过限制');
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return response.error(res, '文件数量超过限制（最多20个）');
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return response.error(res, '意外的文件字段');
      }
      return response.error(res, err.message);
    }

    if (err.message.includes('不支持') || err.message.includes('不匹配')) {
      return response.error(res, err.message);
    }

    logger.error('上传错误:', err);
    return response.error(res, '上传失败');
  }
};

module.exports = uploadController;
