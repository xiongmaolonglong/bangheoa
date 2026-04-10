const { Order, MeasureFace, User, OrderLog, DesignScheme, DesignGroup, DesignGroupFace, DesignDrawing, OrderAdItem, AdType, Material } = require('../models')
const response = require('../utils/response')
const { sequelize } = require('../config/database')
const { Op } = require('sequelize')

// 获取生产任务列表
exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const where = {}

    // 根据角色过滤
    if (req.user.role === 'producer') {
      where.current_handler_id = req.user.id
    }

    // 状态过滤 - 默认显示生产中和核对中
    if (status === 'producing') {
      where.status = 'producing'
    } else if (status === 'checking') {
      where.status = 'checking'
    } else {
      // 未指定状态时，显示所有生产相关状态
      where.status = { [require('sequelize').Op.in]: ['producing', 'checking'] }
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    })

    response.success(res, { total: count, list: rows, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取生产详情
exports.getDetail = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] },
        {
          model: DesignScheme,
          as: 'designScheme',
          include: [
            {
              model: DesignGroup,
              as: 'groups',
              include: [
                {
                  model: DesignGroupFace,
                  as: 'faceRelations',
                  include: [{ model: MeasureFace, as: 'face' }]
                },
                { model: DesignDrawing, as: 'drawings' }
              ]
            }
          ]
        }
      ]
    })

    if (!order) {
      return response.notFound(res, '订单不存在')
    }

    // 获取测量面数据
    const measureFaces = await MeasureFace.findAll({
      include: [
        {
          model: OrderAdItem,
          as: 'adItem',
          where: { order_id: orderId },
          required: true,
          include: [
            { model: AdType, as: 'adType', attributes: ['id', 'name'] }
          ]
        },
        { model: Material, as: 'material', attributes: ['id', 'name'] }
      ]
    })

    response.success(res, { ...order.toJSON(), measureFaces })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新测量面生产状态
exports.updateFace = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { faceId } = req.params
    const { producer_id, production_status, remark } = req.body

    const face = await MeasureFace.findByPk(faceId, { transaction })
    if (!face) {
      await transaction.rollback()
      return response.notFound(res, '测量面不存在')
    }

    await face.update({
      producer_id: producer_id || req.user.id,
      production_status,
      remark
    }, { transaction })

    await transaction.commit()
    response.success(res, face, '更新成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 提交核对记录
exports.submitCheck = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { checkItems, remark } = req.body

    // 检查订单状态
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'checking') {
      await transaction.rollback()
      return response.error(res, '订单状态不允许核对', 1, 400)
    }

    // 更新订单状态
    const oldStatus = order.status
    await order.update({ status: 'installing' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'check_submit',
      from_status: oldStatus,
      to_status: 'installing',
      remark: remark || '核对完成'
    }, { transaction })

    await transaction.commit()
    response.success(res, order, '核对完成')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 完成生产
exports.completeProduction = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'producing') {
      await transaction.rollback()
      return response.error(res, '订单状态不允许此操作', 1, 400)
    }

    // 更新订单状态
    const oldStatus = order.status
    await order.update({ status: 'checking' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'production_complete',
      from_status: oldStatus,
      to_status: 'checking',
      remark: '生产完成'
    }, { transaction })

    await transaction.commit()
    response.success(res, order, '生产完成')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 返工
exports.rejectCheck = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { reason } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'checking') {
      await transaction.rollback()
      return response.error(res, '订单状态不允许此操作', 1, 400)
    }

    // 更新订单状态
    const oldStatus = order.status
    await order.update({ status: 'producing' }, { transaction })

    // 重置测量面核对状态
    const faces = await MeasureFace.findAll({
      include: [{
        model: require('../models').OrderAdItem,
        as: 'adItem',
        where: { order_id: orderId },
        required: true
      }],
      transaction
    })

    for (const face of faces) {
      await face.update({ check_status: 'pending' }, { transaction })
    }

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'check_reject',
      from_status: oldStatus,
      to_status: 'producing',
      remark: reason || '返工'
    }, { transaction })

    await transaction.commit()
    response.success(res, order, '已返回生产')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}
