const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const addressRoutes = require('./address');
const tenantRoutes = require('./tenant');
const clientRoutes = require('./client');

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

module.exports = router;
