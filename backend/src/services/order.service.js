const { Order, Group, District, Province, User, OrderAdItem, MeasureFace, MeasureReport, OrderLog, AdType } = require('../models')
const { Op } = require('sequelize')
const { sequelize } = require('../config/database')
const { ORDER_SOURCE } = require('../config/constants')

// 生成订单编号
async function generateOrderNo(groupId, transaction) {
  const group = await Group.findByPk(groupId, {
    include: [{
      model: District,
      as: 'district',
      include: [{ model: Province, as: 'province' }]
    }],
    transaction
  })

  if (!group) throw new Error('小组不存在')

  const now = new Date()
  const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`

  // 使用 FOR UPDATE 行锁防止并发重复
  const lastOrder = await Order.findOne({
    where: {
      group_id: groupId,
      created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) }
    },
    order: [['order_no', 'DESC']],
    lock: transaction.LOCK.UPDATE,
    transaction
  })

  let serial = 1
  if (lastOrder && lastOrder.order_no) {
    const parts = lastOrder.order_no.split('-')
    if (parts.length === 5) {
      serial = parseInt(parts[4]) + 1
    }
  }

  const provinceCode = group.district.province.code
  const districtCode = group.district.code
  const groupCode = group.code

  return `${provinceCode}-${districtCode}-${groupCode}-${yearMonth}-${serial.toString().padStart(4, '0')}`
}

// 创建订单
async function createOrder(data, userId) {
  const transaction = await sequelize.transaction()

  try {
    // 生成订单编号（传入事务以使用行锁）
    const orderNo = await generateOrderNo(data.group_id, transaction)

    // 提取广告项目数据
    const { ad_items, ...orderData } = data

    // 创建订单 - 后台新建直接进入设计阶段
    const order = await Order.create({
      ...orderData,
      order_no: orderNo,
      status: 'designing',
      source: ORDER_SOURCE.ADMIN,  // 后台新建订单
      current_handler_id: userId
    }, { transaction })

    // 创建广告项目和测量面
    if (ad_items && ad_items.length > 0) {
      for (const item of ad_items) {
        // 创建广告项
        const adItem = await OrderAdItem.create({
          order_id: order.id,
          ad_type_id: item.ad_type_id,
          remark: item.remark || ''
        }, { transaction })

        // 创建测量面
        if (item.faces && item.faces.length > 0) {
          for (const face of item.faces) {
            // 从 attributes 中提取尺寸信息
            const attrs = face.attributes || {}
            const width = attrs.width || face.width || null
            const height = attrs.height || face.height || null

            await MeasureFace.create({
              order_ad_item_id: adItem.id,
              face_name: face.face_name,
              width: width,
              height: height,
              area: width && height ? (width * height) / 10000 : null, // 转换为平方米
              material_id: attrs.material_id || face.material_id || null,
              photos: face.images || face.photos || [],
              remark: attrs.remark || face.remark || ''
            }, { transaction })
          }
        }
      }
    }

    // 记录日志
    await OrderLog.create({
      order_id: order.id,
      operator_id: userId,
      action: 'create',
      from_status: null,
      to_status: 'designing',
      remark: '创建订单（后台新建）'
    }, { transaction })

    await transaction.commit()
    return order
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

// 订单列表
async function getOrderList(params) {
  const { page = 1, pageSize = 20, status, keyword, group_id, start_date, end_date } = params

  const where = {}

  if (status && status !== 'all') {
    // 支持多状态查询（逗号分隔）
    const statusArray = status.split(',').map(s => s.trim())
    if (statusArray.length === 1) {
      where.status = statusArray[0]
    } else {
      where.status = { [Op.in]: statusArray }
    }
  }

  if (group_id) {
    where.group_id = group_id
  }

  if (keyword) {
    where[Op.or] = [
      { order_no: { [Op.like]: `%${keyword}%` } },
      { title: { [Op.like]: `%${keyword}%` } },
      { customer_name: { [Op.like]: `%${keyword}%` } }
    ]
  }

  if (start_date && end_date) {
    where.created_at = {
      [Op.between]: [new Date(start_date), new Date(end_date)]
    }
  }

  const { count, rows } = await Order.findAndCountAll({
    distinct: true,
    where,
    include: [
      { model: Group, as: 'group', include: [{ model: District, as: 'district', include: [{ model: Province, as: 'province' }] }] },
      { model: User, as: 'customer' },
      { model: User, as: 'handler' },
      {
        model: OrderAdItem,
        as: 'adItems',
        include: [
          { model: AdType, as: 'adType', attributes: ['id', 'name'] },
          { model: MeasureFace, as: 'faces', attributes: ['id', 'face_name'] }
        ]
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(pageSize),
    offset: (parseInt(page) - 1) * parseInt(pageSize)
  })

  return { total: count, list: rows, page: parseInt(page), pageSize: parseInt(pageSize) }
}

// 订单详情
async function getOrderDetail(orderId) {
  const { Material } = require('../models')

  return await Order.findByPk(orderId, {
    include: [
      { model: Group, as: 'group', include: [{ model: District, as: 'district' }] },
      { model: User, as: 'customer' },
      { model: User, as: 'handler' },
      {
        model: OrderAdItem,
        as: 'adItems',
        include: [
          { model: AdType, as: 'adType', attributes: ['id', 'name'] },
          {
            model: MeasureFace,
            as: 'faces',
            include: [{ model: Material, as: 'material', attributes: ['id', 'name'] }]
          }
        ]
      },
      { model: MeasureReport, as: 'measureReport' },
      { model: OrderLog, as: 'logs', include: [{ model: User, as: 'operator' }] }
    ]
  })
}

// 更新订单
async function updateOrder(orderId, data, userId, userRole) {
  const transaction = await sequelize.transaction()

  try {
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) throw new Error('订单不存在')

    // 权限检查：设计师只能修改自己的订单，管理员可以修改全部
    if (userRole === 'designer') {
      if (order.current_handler_id !== userId) {
        throw new Error('您只能修改自己负责的订单')
      }
    }

    // 提取广告项目数据
    const { ad_items, ...orderData } = data

    // 更新订单基本信息
    await order.update(orderData, { transaction })

    // 如果有广告项目数据，更新广告项目和测量面
    if (ad_items && ad_items.length > 0) {
      // 删除旧的广告项目和测量面
      const oldAdItems = await OrderAdItem.findAll({
        where: { order_id: orderId },
        transaction
      })

      for (const oldItem of oldAdItems) {
        await MeasureFace.destroy({
          where: { order_ad_item_id: oldItem.id },
          transaction
        })
      }

      await OrderAdItem.destroy({
        where: { order_id: orderId },
        transaction
      })

      // 创建新的广告项目和测量面
      for (const item of ad_items) {
        const adItem = await OrderAdItem.create({
          order_id: order.id,
          ad_type_id: item.ad_type_id,
          remark: item.remark || ''
        }, { transaction })

        if (item.faces && item.faces.length > 0) {
          for (const face of item.faces) {
            const attrs = face.attributes || {}
            const width = attrs.width || face.width || null
            const height = attrs.height || face.height || null

            await MeasureFace.create({
              order_ad_item_id: adItem.id,
              face_name: face.face_name,
              width: width,
              height: height,
              area: width && height ? (width * height) / 10000 : null, // 转换为平方米
              material_id: attrs.material_id || face.material_id || null,
              photos: face.images || face.photos || [],
              remark: attrs.remark || face.remark || ''
            }, { transaction })
          }
        }
      }
    }

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: userId,
      action: 'update',
      from_status: order.status,
      to_status: order.status,
      remark: '更新订单信息'
    }, { transaction })

    await transaction.commit()
    return order
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

// 删除订单
async function deleteOrder(orderId, userId) {
  const order = await Order.findByPk(orderId)
  if (!order) throw new Error('订单不存在')

  await order.destroy()
  return true
}

// 批量删除订单
async function batchDeleteOrders(ids, userId) {
  const transaction = await sequelize.transaction()
  try {
    // 删除关联数据
    for (const id of ids) {
      const adItems = await OrderAdItem.findAll({ where: { order_id: id }, transaction })
      for (const item of adItems) {
        await MeasureFace.destroy({ where: { order_ad_item_id: item.id }, transaction })
      }
      await OrderAdItem.destroy({ where: { order_id: id }, transaction })
      await OrderLog.destroy({ where: { order_id: id }, transaction })
    }
    // 删除订单
    await Order.destroy({ where: { id: ids }, transaction })
    await transaction.commit()
    return true
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

// 推进订单状态
async function advanceOrder(orderId, data, userId) {
  const { status, handler_id, remark } = data
  const order = await Order.findByPk(orderId)

  if (!order) throw new Error('订单不存在')

  const oldStatus = order.status
  order.status = status
  if (handler_id) order.current_handler_id = handler_id
  await order.save()

  // 记录日志
  await OrderLog.create({
    order_id: orderId,
    operator_id: userId,
    action: 'advance',
    from_status: oldStatus,
    to_status: status,
    remark: remark || '推进订单'
  })

  return order
}

// 获取订单日志
async function getOrderLogs(orderId) {
  return await OrderLog.findAll({
    where: { order_id: orderId },
    include: [{ model: User, as: 'operator' }],
    order: [['created_at', 'DESC']]
  })
}

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  updateOrder,
  deleteOrder,
  batchDeleteOrders,
  advanceOrder,
  getOrderLogs,
  generateOrderNo
}
