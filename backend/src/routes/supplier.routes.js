const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有供应商路由需要认证
router.use(authenticate);

// 获取所有启用的供应商（下拉选择用）
router.get('/all',
  supplierController.getAll
);

// 获取供应商列表 - 管理员、审核主管、生产员可访问
router.get('/',
  authorize(['admin', 'reviewer', 'producer']),
  supplierController.getList
);

// 获取供应商详情
router.get('/:id',
  authorize(['admin', 'reviewer', 'producer']),
  supplierController.getDetail
);

// 创建供应商 - 仅管理员
router.post('/',
  authorize(['admin']),
  supplierController.create
);

// 更新供应商 - 仅管理员
router.put('/:id',
  authorize(['admin']),
  supplierController.update
);

// 删除供应商 - 仅管理员
router.delete('/:id',
  authorize(['admin']),
  supplierController.delete
);

// 更新供应商状态 - 仅管理员
router.put('/:id/status',
  authorize(['admin']),
  supplierController.updateStatus
);

module.exports = router;
