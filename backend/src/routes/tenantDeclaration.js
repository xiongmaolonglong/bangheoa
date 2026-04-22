const express = require('express');

const router = express.Router();
const { requireTenant } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const {
  getTenantDeclarations,
  getTenantDeclarationById,
  receiveDeclaration,
} = require('../controllers/declarationController');

// Tenant routes - 广告商查看申报
router.use(requireTenant, injectTenant);
router.get('/', getTenantDeclarations);

// 子路由（必须在 :id 之前）
router.post('/:id/receive', receiveDeclaration);
router.get('/:id', getTenantDeclarationById);

module.exports = router;
