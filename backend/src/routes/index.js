const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const addressRoutes = require('./address');
const tenantRoutes = require('./tenant');
const clientRoutes = require('./client');
const workOrderRoutes = require('./workOrder');
const assignmentRoutes = require('./assignment');
const declarationRoutes = require('./declaration');
const tenantDeclarationRoutes = require('./tenantDeclaration');
const designRoutes = require('./design');
const fileRoutes = require('./file');
const productionRoutes = require('./production');
const constructionRoutes = require('./construction');
const financeRoutes = require('./finance');
const archiveRoutes = require('./archive');
const aftersaleRoutes = require('./aftersale');
const notificationRoutes = require('./notification');

// Health check
router.use('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes
router.use('/auth', authRoutes);

// Address dictionary routes
router.use('/addresses', addressRoutes);

// Tenant management routes
router.use('/v1/tenant', tenantRoutes);

// Client (甲方) management routes
router.use('/v1', clientRoutes);

// Work Order routes
router.use('/v1/work-orders', workOrderRoutes);

// Assignment & Measurement routes
router.use('/v1', assignmentRoutes);

// Design routes
router.use('/v1/designs', designRoutes);

// Declaration routes (client)
router.use('/declarations', declarationRoutes);

// Tenant declaration routes (advertiser)
router.use('/tenant/declarations', tenantDeclarationRoutes);

// File upload routes
router.use('/v1/files', fileRoutes);

// Production routes
router.use('/v1/production', productionRoutes);

// Construction routes
router.use('/v1/construction', constructionRoutes);

// Finance routes
router.use('/v1/finance', financeRoutes);

// Archive routes
router.use('/v1/archives', archiveRoutes);

// Aftersale routes
router.use('/v1/aftersales', aftersaleRoutes);

// Notification routes
router.use('/v1/notifications', notificationRoutes);

module.exports = router;
