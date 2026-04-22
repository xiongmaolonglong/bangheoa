const { Order, InstallReport, MeasureFace, User, OrderLog, DesignScheme, DesignGroup, DesignGroupFace, DesignDrawing, OrderAdItem, AdType, Material } = require('../models')
const { Op } = require('sequelize')
const response = require('../utils/response')
const { sequelize } = require('../config/database')

// 获取安装任务列表
exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const where = {
      status: { [Op.in]: ['installing', 'install_review', 'archived'] }
    }

    // 根据角色过滤
    if (req.user.role === 'field_worker') {
      where.current_handler_id = req.user.id
    }

    // 状态过滤
    if (status === 'installing') {
      where.status = 'installing'
    } else if (status === 'install_review') {
      where.status = 'install_review'
    } else if (status === 'archived') {
      where.status = 'archived'
    } else if (status === 'pending') {
      where.status = 'install_review'
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

// 获取安装详情
exports.getDetail = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] },
        {
          model: InstallReport,
          as: 'installReport',
          include: [{ model: User, as: 'installer', attributes: ['id', 'real_name'] }]
        },
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
            { model: AdType, as: 'adType', attributes: ['id', 'name'] },
            { model: Material, as: 'material', attributes: ['id', 'name'] }
          ]
        }
      ]
    })

    response.success(res, { ...order.toJSON(), measureFaces })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 提交安装报告
exports.submitReport = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { install_date, photos, remark, faces } = req.body

    // 检查订单状态
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'installing') {
      await transaction.rollback()
      return response.error(res, '订单状态不允许提交安装报告', 1, 400)
    }

    // 创建/更新安装报告
    let report = await InstallReport.findOne({ where: { order_id: orderId }, transaction })

    if (report) {
      await report.update({
        installer_id: req.user.id,
        install_date,
        photos: photos ? JSON.stringify(photos) : null,
        remark
      }, { transaction })
    } else {
      report = await InstallReport.create({
        order_id: orderId,
        installer_id: req.user.id,
        install_date,
        photos: photos ? JSON.stringify(photos) : null,
        remark
      }, { transaction })
    }

    // 更新测量面安装状态
    if (faces && faces.length > 0) {
      for (const face of faces) {
        await MeasureFace.update(
          { install_status: face.install_status || 'installed' },
          { where: { id: face.id }, transaction }
        )
      }
    }

    // 更新订单状态
    const oldStatus = order.status
    await order.update({ status: 'install_review' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'install_submit',
      from_status: oldStatus,
      to_status: 'install_review',
      remark: '提交安装报告'
    }, { transaction })

    await transaction.commit()
    response.success(res, report, '安装报告提交成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 获取安装报告
exports.getReport = async (req, res) => {
  try {
    const { orderId } = req.params

    const report = await InstallReport.findOne({
      where: { order_id: orderId },
      include: [
        { model: User, as: 'installer', attributes: ['id', 'real_name', 'phone'] },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_no', 'title', 'address']
        }
      ]
    })

    if (!report) {
      return response.notFound(res, '安装报告不存在')
    }

    response.success(res, report)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新安装报告
exports.updateReport = async (req, res) => {
  try {
    const { orderId } = req.params
    const data = req.body

    const report = await InstallReport.findOne({ where: { order_id: orderId } })
    if (!report) {
      return response.notFound(res, '安装报告不存在')
    }

    await report.update(data)
    response.success(res, report, '更新成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 审核通过
exports.approve = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { orderId } = req.params
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    const oldStatus = order.status
    await order.update({ status: 'archived' }, { transaction })

    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'install_approve',
      from_status: oldStatus,
      to_status: 'archived',
      remark: '安装审核通过，订单归档'
    }, { transaction })

    await transaction.commit()
    response.success(res, null, '审核通过，订单已归档')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 审核驳回
exports.reject = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { orderId } = req.params
    const { reason } = req.body
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    const oldStatus = order.status
    await order.update({ status: 'installing' }, { transaction })

    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'install_reject',
      from_status: oldStatus,
      to_status: 'installing',
      remark: reason || '安装审核驳回'
    }, { transaction })

    await transaction.commit()
    response.success(res, null, '已驳回，需重新安装')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}
