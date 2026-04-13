const express = require('express');
const router = express.Router();
const { requireTenant } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/tenantSettingsController');

// 需要 tenant 认证 + 租户隔离
router.use(requireTenant, injectTenant);

router.get('/', controller.getSettings);
router.put('/', controller.updateSettings);
router.patch('/:key', controller.updateSettingKey);

module.exports = router;
