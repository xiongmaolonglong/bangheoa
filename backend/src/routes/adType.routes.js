const express = require('express')
const router = express.Router()
const adTypeController = require('../controllers/adType.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 广告类型列表
router.get('/', auth, adTypeController.getList)

// 用量统计
router.get('/usage', auth, adTypeController.getUsage)

// 导出配置
router.get('/export', auth, adTypeController.exportConfig)

// 导入配置
router.post('/import', auth, adTypeController.importConfig)

// 广告类型完整配置（用于新建订单）
router.get('/:id/config', auth, adTypeController.getConfig)

// 广告类型详情
router.get('/:id', auth, adTypeController.getDetail)

// 创建广告类型
router.post('/', auth, adTypeController.create)

// 更新广告类型
router.put('/:id', auth, adTypeController.update)

// 删除广告类型
router.delete('/:id', auth, adTypeController.delete)

module.exports = router
