const express = require('express')
const router = express.Router()
const designController = require('../controllers/design.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 设计任务列表
router.get('/tasks', auth, designController.getTasks)

// 设计管理相关接口
router.get('/manage', auth, designController.getManageList)
router.get('/manage/designers', auth, designController.getDesigners)
router.get('/manage/:orderId', auth, designController.getManageDetail)
router.post('/manage/:orderId/dispatch', auth, designController.dispatch)
router.post('/manage/:orderId/approve', auth, designController.approve)
router.post('/manage/:orderId/reject', auth, designController.reject)

// 设计详情
router.get('/:orderId', auth, designController.getDetail)

// 提交设计方案
router.post('/:orderId/scheme', auth, designController.submitScheme)

// 获取设计方案
router.get('/:orderId/scheme', auth, designController.getScheme)

module.exports = router
