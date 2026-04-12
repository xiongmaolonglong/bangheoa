const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const controller = require('../controllers/financeController');

// 所有财务路由需要登录 + 租户隔离
router.use(requireAuth, injectTenant);

// 报价列表（必须在 :workOrderId 之前）
router.get('/quotes', controller.listQuotes);

// 结算模板导出
router.get('/settlement-template/:workOrderId', controller.getSettlementTemplate);

// 生成报价
router.post('/:workOrderId/quote', controller.createQuote);

// 收款记录
router.post('/:workOrderId/payment', controller.recordPayment);

// 开票记录
router.post('/:workOrderId/invoice', controller.recordInvoice);

// 结算资料提交
router.post('/:workOrderId/settlement', controller.submitSettlement);

// 结算驳回
router.post('/:workOrderId/settlement/reject', controller.rejectSettlement);

module.exports = router;
