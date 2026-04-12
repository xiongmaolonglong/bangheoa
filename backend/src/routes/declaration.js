const express = require('express');

const router = express.Router();
const { requireClient } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const {
  createDeclaration,
  getDeclarations,
  getDeclarationById,
  approveDeclaration,
  rejectDeclaration,
} = require('../controllers/declarationController');

// Client routes
router.post('/declarations', requireClient, createDeclaration);
router.get('/declarations', requireClient, getDeclarations);
router.get('/declarations/:id', requireClient, getDeclarationById);

// Approval actions
router.post('/declarations/:id/approve', requireClient, approveDeclaration);
router.post('/declarations/:id/reject', requireClient, rejectDeclaration);

module.exports = router;
