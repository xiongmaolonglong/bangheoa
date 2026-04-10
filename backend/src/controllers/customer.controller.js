const { Order, sequelize } = require('../models')
const response = require('../utils/response')
const { Op } = require('sequelize')

// 获取客户列表 - 从订单数据聚合
exports.getList = async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query

    // 获取所有订单中的客户信息
    const orders = await Order.findAll({
      attributes: [
        'customer_name',
        'customer_phone',
        'address',
        'form_data',
        'status',
        'customer_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
        [sequelize.fn('MAX', sequelize.col('created_at')), 'last_order_date'],
        [sequelize.fn('MIN', sequelize.col('created_at')), 'first_order_date']
      ],
      group: ['customer_phone'],
      order: [[sequelize.fn('MAX', sequelize.col('created_at')), 'DESC']],
      raw: true
    })

    // 聚合客户数据
    const allCustomers = orders.map(o => {
      const formData = typeof o.form_data === 'string' ? JSON.parse(o.form_data || '{}') : (o.form_data || {})
      return {
        customer_phone: o.customer_phone || formData.phone || formData.sales_phone || '',
        customer_name: o.customer_name || formData.company || formData.name || '',
        company: formData.company || formData.shop_name || formData.store_name || null,
        shop_phone: formData.phone || formData.sales_phone || formData.shop_phone || null,
        address: o.address,
        order_count: parseInt(o.order_count),
        last_order_date: o.last_order_date,
        first_order_date: o.first_order_date
      }
    })

    // 关键词过滤
    let filtered = allCustomers
    if (keyword) {
      filtered = allCustomers.filter(c =>
        (c.customer_name && c.customer_name.includes(keyword)) ||
        c.customer_phone.includes(keyword) ||
        (c.company && c.company.includes(keyword)) ||
        (c.shop_phone && c.shop_phone.includes(keyword))
      )
    }

    // 分页
    const total = filtered.length
    const start = (parseInt(page) - 1) * parseInt(pageSize)
    const list = filtered.slice(start, start + parseInt(pageSize))

    response.success(res, { total, list, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取客户详情
exports.getDetail = async (req, res) => {
  try {
    const { phone } = req.params

    const orders = await Order.findAll({
      where: { customer_phone: phone },
      attributes: ['id', 'order_no', 'status', 'title', 'address', 'form_data', 'created_at'],
      order: [['created_at', 'DESC']]
    })

    if (orders.length === 0) {
      return response.notFound(res, '客户不存在')
    }

    const firstOrder = orders[0]
    const formData = firstOrder.form_data || {}

    response.success(res, {
      customer_name: firstOrder.customer_name,
      customer_phone: phone,
      company: formData.company || formData.shop_name || formData.store_name || null,
      address: firstOrder.address,
      order_count: orders.length,
      orders
    })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新客户备注
exports.update = async (req, res) => {
  try {
    const { phone } = req.params
    const { remark } = req.body

    // 更新该客户所有订单的备注
    await Order.update(
      { remark: remark || null },
      { where: { customer_phone: phone } }
    )

    response.success(res, { customer_phone: phone, remark }, '更新成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取客户标签列表 - 从订单中提取
exports.getTags = async (req, res) => {
  try {
    const orders = await Order.findAll({
      attributes: ['form_data'],
      where: { form_data: { [Op.ne]: null } },
      raw: true
    })

    const allTags = new Set()
    orders.forEach(o => {
      const formData = typeof o.form_data === 'string' ? JSON.parse(o.form_data || '{}') : (o.form_data || {})
      if (formData.company) allTags.add(formData.company)
      if (formData.tags && Array.isArray(formData.tags)) {
        formData.tags.forEach(t => t && allTags.add(t))
      }
    })

    response.success(res, Array.from(allTags))
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
