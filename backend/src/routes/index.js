const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');

// Health check
router.use('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes
router.use('/auth', authRoutes);

module.exports = router;
