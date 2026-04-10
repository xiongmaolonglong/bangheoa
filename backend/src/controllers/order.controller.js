const orderService = require('../services/order.service')
const response = require('../utils/response')
const asyncHandler = require('../utils/asyncHandler')
const { Order, User } = require('../models')
const { Op } = require('sequelize')

exports.create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.id)
  response.success(res, order, '订单创建成功')
})

exports.list = asyncHandler(async (req, res) => {
  const result = await orderService.getOrderList(req.query)
  response.success(res, result)
})

exports.detail = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderDetail(req.params.id)
  if (!order) {
    return response.notFound(res, '订单不存在')
  }
  response.success(res, order)
})

exports.update = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.params.id, req.body, req.user.id, req.user.role)
  response.success(res, order, '订单更新成功')
})

exports.delete = asyncHandler(async (req, res) => {
  await orderService.deleteOrder(req.params.id, req.user.id)
  response.success(res, null, '订单删除成功')
})

exports.batchDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return response.error(res, '请选择要删除的订单')
  }
  await orderService.batchDeleteOrders(ids, req.user.id)
  response.success(res, null, '批量删除成功')
})

exports.advance = asyncHandler(async (req, res) => {
  const order = await orderService.advanceOrder(req.params.id, req.body, req.user.id)
  response.success(res, order, '订单状态已更新')
})

exports.logs = asyncHandler(async (req, res) => {
  const logs = await orderService.getOrderLogs(req.params.id)
  response.success(res, logs)
})

// 获取所有订单经纬度（用于地图）
exports.locations = asyncHandler(async (req, res) => {
  const { status, keyword } = req.query
  const where = {}

  if (status && status !== 'all') {
    where.status = status
  }
  if (keyword) {
    where[Op.or] = [
      { order_no: { [Op.like]: `%${keyword}%` } },
      { customer_name: { [Op.like]: `%${keyword}%` } },
      { address: { [Op.like]: `%${keyword}%` } }
    ]
  }

  const orders = await Order.findAll({
    where,
    attributes: ['id', 'order_no', 'title', 'address', 'latitude', 'longitude', 'status', 'customer_name', 'customer_phone', 'current_handler_id', 'group_id', 'province_id', 'district_id', 'photos', 'created_at', 'expected_date', 'estimated_area'],
    include: [{ model: User, as: 'handler', attributes: ['id', 'real_name', 'role'] }],
    order: [['created_at', 'DESC']]
  })

  const locations = orders
    .filter(o => o.latitude && o.longitude)
    .map(o => ({
      id: o.id,
      order_no: o.order_no,
      title: o.title,
      address: o.address,
      latitude: parseFloat(o.latitude),
      longitude: parseFloat(o.longitude),
      status: o.status,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      handler_id: o.current_handler_id,
      handler: o.handler ? { id: o.handler.id, real_name: o.handler.real_name, role: o.handler.role } : null,
      group_id: o.group_id,
      province_id: o.province_id,
      district_id: o.district_id,
      photos: o.photos || [],
      created_at: o.created_at,
      expected_date: o.expected_date,
      estimated_area: o.estimated_area
    }))

  response.success(res, { total: locations.length, list: locations })
})
