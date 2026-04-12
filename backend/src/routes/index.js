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
const adminRoutes = require('./admin');
const notificationRoutes = require('./notification');
const wechatRoutes = require('./wechat');

// Health check
router.use('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes -> /api/v1/auth/*
router.use('/auth', authRoutes);

// Address dictionary routes -> /api/v1/addresses/*
router.use('/addresses', addressRoutes);

// Tenant management routes -> /api/v1/tenants/*
router.use('/tenants', tenantRoutes);

// Client (甲方) management routes -> /api/v1/clients/*
router.use('/clients', clientRoutes);

// Work Order routes -> /api/v1/work-orders/*
router.use('/work-orders', workOrderRoutes);

// Assignment & Measurement routes -> /api/v1/*
router.use('/', assignmentRoutes);

// Design routes -> /api/v1/designs/*
router.use('/designs', designRoutes);

// Declaration routes (client) -> /api/v1/declarations/*
router.use('/declarations', declarationRoutes);

// Tenant declaration routes -> /api/v1/tenant/declarations/*
router.use('/tenant/declarations', tenantDeclarationRoutes);

// File upload routes -> /api/v1/files/*
router.use('/files', fileRoutes);

// Production routes -> /api/v1/production/*
router.use('/production', productionRoutes);

// Construction routes -> /api/v1/construction/*
router.use('/construction', constructionRoutes);

// Finance routes -> /api/v1/finance/*
router.use('/finance', financeRoutes);

// Archive routes -> /api/v1/archives/*
router.use('/archives', archiveRoutes);

// Aftersale routes -> /api/v1/aftersales/*
router.use('/aftersales', aftersaleRoutes);

// Notification routes -> /api/v1/notifications/*
router.use('/notifications', notificationRoutes);

// WeChat routes -> /api/v1/wechat/*
router.use('/wechat', wechatRoutes);

// Super Admin routes -> /api/v1/admin/*
router.use('/admin', adminRoutes);

module.exports = router;
