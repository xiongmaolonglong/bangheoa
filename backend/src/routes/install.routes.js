const express = require('express')
const router = express.Router()
const installController = require('../controllers/install.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 安装任务列表
router.get('/tasks', auth, installController.getTasks)

// 安装详情
router.get('/:orderId', auth, installController.getDetail)

// 获取安装报告
router.get('/:orderId/report', auth, installController.getReport)

// 提交安装报告
router.post('/:orderId/report', auth, installController.submitReport)

// 更新安装报告
router.put('/:orderId/report', auth, installController.updateReport)

// 审核通过
router.post('/:orderId/approve', auth, installController.approve)

// 审核驳回
router.post('/:orderId/reject', auth, installController.reject)

module.exports = router
