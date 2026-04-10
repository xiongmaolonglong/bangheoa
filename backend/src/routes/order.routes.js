const express = require('express')
const router = express.Router()
const orderController = require('../controllers/order.controller')
const { authMiddleware } = require('../middleware/auth')
const { checkPermission, checkResourcePermission } = require('../middleware/permission')

// 订单列表 - 需要 order.read 权限
router.get('/',
  authMiddleware,
  checkResourcePermission('order', 'read'),
  orderController.list
)

// 订单经纬度（地图用）- 必须在 /:id 之前
router.get('/locations',
  authMiddleware,
  orderController.locations
)

// 创建订单 - 需要 order.create 权限
router.post('/',
  authMiddleware,
  checkResourcePermission('order', 'create'),
  orderController.create
)

// 批量删除 - 需要 order.delete 权限
router.post('/batch-delete',
  authMiddleware,
  checkResourcePermission('order', 'delete'),
  orderController.batchDelete
)

// 订单详情 - 需要 order.read 权限
router.get('/:id',
  authMiddleware,
  checkResourcePermission('order', 'read'),
  orderController.detail
)

// 更新订单 - 需要 order.update 权限
router.put('/:id',
  authMiddleware,
  checkResourcePermission('order', 'update'),
  orderController.update
)

// 删除订单 - 需要 order.delete 权限
router.delete('/:id',
  authMiddleware,
  checkResourcePermission('order', 'delete'),
  orderController.delete
)

// 推进订单状态 - 需要 order.update_status 权限
router.post('/:id/advance',
  authMiddleware,
  checkResourcePermission('order', 'update_status'),
  orderController.advance
)

// 订单日志 - 需要 order.read 权限
router.get('/:id/logs',
  authMiddleware,
  checkResourcePermission('order', 'read'),
  orderController.logs
)

module.exports = router
