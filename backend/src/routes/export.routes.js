/**
 * 导出路由
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkResourcePermission } = require('../middleware/permission');

// 所有导出路由需要认证
router.use(authMiddleware);

// 导出订单列表 (Excel)
router.get('/orders/excel',
  checkResourcePermission('order', 'read'),
  exportController.exportOrdersExcel
);

// 导出订单详情 (PDF/HTML)
router.get('/orders/:id/pdf',
  checkResourcePermission('order', 'read'),
  exportController.exportOrderPdf
);

// 批量导出订单
router.post('/orders/batch',
  checkResourcePermission('order', 'read'),
  exportController.batchExport
);

// 下载导入模板
router.get('/template',
  exportController.downloadTemplate
);

module.exports = router;