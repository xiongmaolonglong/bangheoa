const fs = require('fs');
const path = require('path');
const { buildFileUrl } = require('../middleware/upload');

/**
 * POST /api/v1/files
 * 上传单个文件
 */
function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: '未选择文件' });
  }

  const tenantId = req.user.tenant_id;
  const workOrderId = req.body.work_order_id || 'general';
  const url = buildFileUrl(tenantId, workOrderId, req.file.filename);

  return res.status(201).json({
    url,
    original_name: req.file.originalname,
    size: req.file.size,
    mime_type: req.file.mimetype,
  });
}

/**
 * POST /api/v1/files/batch
 * 批量上传文件（最多 9 个）
 */
function uploadBatch(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未选择文件' });
  }

  const tenantId = req.user.tenant_id;
  const workOrderId = req.body.work_order_id || 'general';

  const files = req.files.map((f) => ({
    url: buildFileUrl(tenantId, workOrderId, f.filename),
    original_name: f.originalname,
    size: f.size,
    mime_type: f.mimetype,
  }));

  return res.status(201).json({ files });
}

/**
 * DELETE /api/v1/files/:filename
 * 删除文件
 */
function deleteFile(req, res) {
  const { filename } = req.params;
  if (!filename) {
    return res.status(400).json({ error: '文件名为空' });
  }

  // 安全检查: 防止路径穿越
  const sanitized = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(__dirname, '..', '..', 'uploads', sanitized);
  const uploadRoot = path.resolve(__dirname, '..', '..', 'uploads');
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(uploadRoot)) {
    return res.status(403).json({ error: '非法文件路径' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  try {
    fs.unlinkSync(resolvedPath);
    return res.json({ message: '文件已删除' });
  } catch (err) {
    return res.status(500).json({ error: '删除文件失败', details: err.message });
  }
}

module.exports = {
  uploadFile,
  uploadBatch,
  deleteFile,
};
