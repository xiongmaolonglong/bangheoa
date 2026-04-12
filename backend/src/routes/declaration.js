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
router.post('/', requireClient, createDeclaration);
router.get('/', requireClient, getDeclarations);
router.get('/:id', requireClient, getDeclarationById);

// Approval actions
router.post('/:id/approve', requireClient, approveDeclaration);
router.post('/:id/reject', requireClient, rejectDeclaration);

module.exports = router;
