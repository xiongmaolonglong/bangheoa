const express = require('express');
const router = express.Router();

// 导入路由
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const regionRoutes = require('./region.routes');
const orderRoutes = require('./order.routes');
const measureRoutes = require('./measure.routes');
const designRoutes = require('./design.routes');
const productionRoutes = require('./production.routes');
const installRoutes = require('./install.routes');
const adTypeRoutes = require('./adType.routes');
const materialRoutes = require('./material.routes');
const reviewRoutes = require('./review.routes');
const formRoutes = require('./form.routes');
const statisticsRoutes = require('./statistics.routes');
const supplierRoutes = require('./supplier.routes');
const uploadRoutes = require('./upload.routes');
const faceRoutes = require('./face.routes');
const attributeRoutes = require('./attribute.routes');
const locationRoutes = require('./location.routes');
const notificationRoutes = require('./notification.routes');
const auditRoutes = require('./audit.routes');
const exportRoutes = require('./export.routes');
const configRoutes = require('./config.routes');
const dispatchRuleRoutes = require('./dispatchRule.routes');
const customerRoutes = require('./customer.routes');
const locationTrackRoutes = require('./locationTrack.routes');

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/regions', regionRoutes);
router.use('/orders', orderRoutes);
router.use('/measures', measureRoutes);
router.use('/designs', designRoutes);
router.use('/productions', productionRoutes);
router.use('/installs', installRoutes);
router.use('/ad-types', adTypeRoutes);
router.use('/materials', materialRoutes);
router.use('/review', reviewRoutes);
router.use('/forms', formRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/upload', uploadRoutes);
router.use('/faces', faceRoutes);
router.use('/attributes', attributeRoutes);
router.use('/location', locationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit', auditRoutes);
router.use('/export', exportRoutes);
router.use('/config', configRoutes);
router.use('/dispatch-rules', dispatchRuleRoutes);
router.use('/customers', customerRoutes);
router.use('/location-track', locationTrackRoutes);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
