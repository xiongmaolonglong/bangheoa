const express = require('express')
const router = express.Router()
const productionController = require('../controllers/production.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 生产任务列表
router.get('/tasks', auth, productionController.getTasks)

// 生产详情
router.get('/:orderId', auth, productionController.getDetail)

// 更新测量面生产状态
router.put('/faces/:faceId', auth, productionController.updateFace)

// 完成生产
router.post('/:orderId/complete', auth, productionController.completeProduction)

// 提交核对记录
router.post('/:orderId/check', auth, productionController.submitCheck)

// 返工
router.post('/:orderId/reject', auth, productionController.rejectCheck)

module.exports = router
