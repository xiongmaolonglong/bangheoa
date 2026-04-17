const express = require('express');

const router = express.Router();
const { requireClient } = require('../middleware/auth');
const {
  createDeclaration,
  getDeclarations,
  getMyApprovals,
  getDeclarationById,
  approveDeclaration,
  rejectDeclaration,
} = require('../controllers/declarationController');

// Client routes
router.post('/', requireClient, createDeclaration);
router.get('/', requireClient, getDeclarations);

// 我的审批（必须在 :id 之前）
router.get('/my-approvals', requireClient, getMyApprovals);

// Approval actions（必须在 :id 之前）
router.post('/:id/approve', requireClient, approveDeclaration);
router.post('/:id/reject', requireClient, rejectDeclaration);

// 申报详情
router.get('/:id', requireClient, getDeclarationById);

module.exports = router;
