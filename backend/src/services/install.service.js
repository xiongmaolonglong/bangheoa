const { Order, InstallReport, DesignScheme, User, OrderAdItem, MeasureFace, OrderLog } = require('../models')
const { Op } = require('sequelize')
const { sequelize } = require('../config/database')

async function getTasks(params, user) {
  const { page = 1, pageSize = 20, status, keyword, group_id } = params

  const where = {
    status: { [Op.in]: ['installing', 'install_review', 'archived'] }
  }

  if (status && status !== 'all') {
    where.status = status
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

  return { total: count, list: rows, page: parseInt(page), pageSize: parseInt(pageSize) }
}

async function getDetail(orderId) {
  return await Order.findByPk(orderId, {
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
        include: ['groups']
      }
    ]
  })
}

async function getReport(orderId) {
  return await InstallReport.findOne({
    where: { order_id: orderId },
    include: [{ model: User, as: 'installer', attributes: ['id', 'real_name'] }]
  })
}

async function submitReport(orderId, data, userId) {
  const transaction = await sequelize.transaction()
  try {
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) throw new Error('订单不存在')

    // 检查是否已有报告
    const existing = await InstallReport.findOne({
      where: { order_id: orderId },
      transaction
    })

    let report
    if (existing) {
      await existing.update({
        ...data,
        installer_id: userId
      }, { transaction })
      report = existing
    } else {
      report = await InstallReport.create({
        order_id: orderId,
        installer_id: userId,
        ...data
      }, { transaction })
    }

    // 更新订单状态为待审核
    await order.update({ status: 'install_review' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: userId,
      action: 'install_submit',
      from_status: 'installing',
      to_status: 'install_review',
      remark: '提交安装报告'
    }, { transaction })

    await transaction.commit()
    return report
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

async function updateReport(orderId, data, userId) {
  const report = await InstallReport.findOne({ where: { order_id: orderId } })
  if (!report) throw new Error('安装报告不存在')

  await report.update(data)
  return report
}

async function approve(orderId, userId) {
  const transaction = await sequelize.transaction()
  try {
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) throw new Error('订单不存在')

    const oldStatus = order.status
    await order.update({ status: 'archived' }, { transaction })

    await OrderLog.create({
      order_id: orderId,
      operator_id: userId,
      action: 'install_approve',
      from_status: oldStatus,
      to_status: 'archived',
      remark: '安装审核通过，订单归档'
    }, { transaction })

    await transaction.commit()
    return true
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

async function reject(orderId, reason, userId) {
  const transaction = await sequelize.transaction()
  try {
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) throw new Error('订单不存在')

    const oldStatus = order.status
    await order.update({ status: 'installing' }, { transaction })

    await OrderLog.create({
      order_id: orderId,
      operator_id: userId,
      action: 'install_reject',
      from_status: oldStatus,
      to_status: 'installing',
      remark: reason || '安装审核驳回'
    }, { transaction })

    await transaction.commit()
    return true
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

module.exports = {
  getTasks,
  getDetail,
  getReport,
  submitReport,
  updateReport,
  approve,
  reject
}