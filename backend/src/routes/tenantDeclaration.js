const express = require('express');

const router = express.Router();
const { requireTenant } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const {
  getTenantDeclarations,
  getTenantDeclarationById,
} = require('../controllers/declarationController');

// Tenant routes - 广告商查看申报
router.use(requireTenant, injectTenant);
router.get('/', getTenantDeclarations);
router.get('/:id', getTenantDeclarationById);

module.exports = router;
