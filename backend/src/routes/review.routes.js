const express = require('express')
const router = express.Router()
const reviewController = require('../controllers/review.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 获取待审核列表
router.get('/pending', auth, reviewController.getPendingList)

// 获取可派单用户
router.get('/handlers', auth, reviewController.getHandlers)

// ===== 自动审核（必须在 /:orderId 之前注册）=====
// 获取订单风险评估
router.get('/auto-review/:orderId/risk', auth, reviewController.getOrderRisk)

// 自动审核配置管理
router.get('/auto-review/config', auth, reviewController.getAutoReviewConfig)
router.put('/auto-review/config', auth, reviewController.updateAutoReviewConfig)

// 手动触发自动审核
router.post('/auto-review/pre-review', auth, reviewController.triggerPreReview)
router.post('/auto-review/timeout-check', auth, reviewController.triggerTimeoutCheck)

// 获取审核详情
router.get('/:orderId', auth, reviewController.getDetail)

// 审核通过
router.post('/:orderId/approve', auth, reviewController.approve)

// 审核驳回
router.post('/:orderId/reject', auth, reviewController.reject)

// 派单
router.post('/:orderId/dispatch', auth, reviewController.dispatch)

module.exports = router
