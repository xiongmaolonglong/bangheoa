const { Order, User, OrderLog, MeasureReport, DesignScheme, InstallReport, Notification } = require('../models')
const response = require('../utils/response')
const { sequelize } = require('../config/database')
const { Op } = require('sequelize')
const { ORDER_SOURCE } = require('../config/constants')
const dispatchService = require('../services/dispatch.service')
const cacheService = require('../services/cache.service')
const autoReviewService = require('../services/autoReview.service')

// 获取待审核任务列表
exports.getPendingList = async (req, res) => {
  try {
    const { type, page = 1, pageSize = 20, mine } = req.query

    // 根据审核类型确定状态
    const statusMap = {
      design: 'design_review',        // 设计审核
      install: 'install_review',      // 安装审核
      order: 'pending_review',        // 订单审核（初始申请）
      pending_review: 'pending_review',
      design_review: 'design_review',
      install_review: 'install_review'
    }

    const where = {}
    if (type && statusMap[type]) {
      where.status = statusMap[type]
    } else {
      // 默认显示所有待审核状态
      where.status = {
        [Op.in]: ['pending_review', 'design_review', 'install_review']
      }
    }

    // 筛选"我的待处理"
    if (mine === 'true' || mine === true) {
      where.current_handler_id = req.user.id
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

// 获取审核详情
exports.getDetail = async (req, res) => {
  try {
    const { orderId } = req.params
    const { OrderAdItem, MeasureFace, Material, DesignGroup, DesignDrawing } = require('../models')

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] },
        {
          model: OrderAdItem,
          as: 'adItems',
          include: [
            { model: require('../models').AdType, as: 'adType', attributes: ['id', 'name'] },
            {
              model: MeasureFace,
              as: 'faces',
              include: [{ model: Material, as: 'material', attributes: ['id', 'name'] }]
            }
          ]
        },
        {
          model: DesignScheme,
          as: 'designScheme',
          include: [
            { model: User, as: 'designer', attributes: ['id', 'real_name', 'phone'] },
            {
              model: DesignGroup,
              as: 'groups',
              include: [
                { model: DesignDrawing, as: 'drawings' },
                {
                  model: require('../models').DesignGroupFace,
                  as: 'faceRelations',
                  attributes: ['id', 'measure_face_id']
                }
              ]
            }
          ]
        },
        {
          model: InstallReport,
          as: 'installReport',
          include: [{ model: User, as: 'installer', attributes: ['id', 'real_name', 'phone'] }]
        }
      ]
    })

    if (!order) {
      return response.notFound(res, '订单不存在')
    }

    // 处理设计方案中的图纸，扁平化为 drawings 数组
    if (order.designScheme && order.designScheme.groups) {
      const drawings = []
      order.designScheme.groups.forEach(group => {
        if (group.drawings) {
          group.drawings.forEach(d => drawings.push(d))
        }
      })
      order.designScheme.setDataValue('drawings', drawings)
    }

    response.success(res, order)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 审核通过
exports.approve = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { handler_id, remark, skip_auto_dispatch } = req.body

    // 获取订单详情（包含小组信息用于自动派单）
    const { Group, District } = require('../models')
    const order = await Order.findByPk(orderId, {
      transaction,
      include: [
        { model: Group, as: 'group', include: [{ model: District, as: 'district' }] }
      ]
    })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    // 根据当前状态确定下一状态（已跳过测量环节）
    const statusFlow = {
      pending_review: 'designing',
      design_review: 'producing',
      install_review: 'archived'
    }

    const nextStatus = statusFlow[order.status]
    if (!nextStatus) {
      await transaction.rollback()
      return response.error(res, '当前订单状态不允许审核', 1, 400)
    }

    // 确定处理人
    let finalHandlerId = handler_id

    // 如果没有手动指定处理人，尝试自动派单
    if (!finalHandlerId && !skip_auto_dispatch) {
      // 检查自动派单开关
      const dispatchMode = await getDispatchMode()
      if (dispatchMode === 'auto') {
        const stageMap = {
          pending_review: 'design',
          design_review: 'produce',
          install_review: 'install'
        }
        const dispatchResult = await dispatchService.autoDispatch(order, stageMap[order.status])
        if (dispatchResult) {
          finalHandlerId = dispatchResult.handler_id
          console.log(`自动派单成功: 订单 ${order.order_no} -> 用户 ${dispatchResult.handler_id} (规则: ${dispatchResult.rule_name})`)
        }
      }
    }

    const oldStatus = order.status
    await order.update({
      status: nextStatus,
      current_handler_id: finalHandlerId || order.current_handler_id
    }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'approve',
      from_status: oldStatus,
      to_status: nextStatus,
      remark: remark || '审核通过'
    }, { transaction })

    // 发送通知
    if (finalHandlerId) {
      await Notification.create({
        user_id: finalHandlerId,
        order_id: orderId,
        type: 'dispatch',
        title: '新任务派单',
        content: `订单 ${order.order_no} 已派单给您`,
        is_read: false
      }, { transaction })
    }

    await transaction.commit()
    response.success(res, order, '审核通过')
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
    const { remark, handler_id } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    // 根据当前状态确定回退状态
    const rejectFlow = {
      pending_review: 'rejected',       // 订单驳回 -> 已驳回
      design_review: 'designing',        // 设计驳回 -> 设计中（重新设计）
      install_review: 'installing'       // 安装驳回 -> 安装中（重新安装）
    }

    const nextStatus = rejectFlow[order.status]
    if (!nextStatus) {
      await transaction.rollback()
      return response.error(res, '当前订单状态不允许驳回', 1, 400)
    }

    const oldStatus = order.status
    await order.update({
      status: nextStatus,
      current_handler_id: handler_id || order.current_handler_id
    }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'reject',
      from_status: oldStatus,
      to_status: nextStatus,
      remark: remark || '审核驳回'
    }, { transaction })

    // 发送通知给处理人
    const notifyUserId = handler_id || order.current_handler_id
    if (notifyUserId) {
      await Notification.create({
        user_id: notifyUserId,
        order_id: orderId,
        type: 'reject',
        title: '任务被驳回',
        content: `订单 ${order.order_no} 已被驳回，请重新处理。原因：${remark || '无'}`,
        is_read: false
      }, { transaction })
    }

    await transaction.commit()
    response.success(res, order, '已驳回')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 派单
exports.dispatch = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { handler_id, role, remark } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (!handler_id) {
      await transaction.rollback()
      return response.error(res, '请指定处理人', 1, 400)
    }

    const oldHandlerId = order.current_handler_id
    await order.update({ current_handler_id: handler_id }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'dispatch',
      from_status: order.status,
      to_status: order.status,
      remark: remark || `派单给用户ID: ${handler_id}`
    }, { transaction })

    // 发送通知
    await Notification.create({
      user_id: handler_id,
      order_id: orderId,
      type: 'dispatch',
      title: '新任务派单',
      content: `订单 ${order.order_no} 已派单给您`,
      is_read: false
    }, { transaction })

    await transaction.commit()
    response.success(res, order, '派单成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 获取可派单用户列表
exports.getHandlers = async (req, res) => {
  try {
    const { role } = req.query

    const where = { status: 1 }
    if (role) {
      where.role = role
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'real_name', 'phone', 'role'],
      order: [['real_name', 'ASC']]
    })

    response.success(res, users)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

/**
 * 获取派单模式：'auto' = 自动派单，'manual' = 手动派单
 */
async function getDispatchMode() {
  try {
    const cached = await cacheService.get('dispatch_mode')
    if (cached) return cached

    const { SystemConfig } = require('../models')
    const config = await SystemConfig.findOne({ where: { config_key: 'dispatch_mode' } })
    const mode = config?.config_value || 'manual'
    await cacheService.set('dispatch_mode', mode, 300) // 5min cache
    return mode
  } catch {
    return 'manual'
  }
}

// ===== 自动审核相关 =====

// 获取自动审核配置
exports.getAutoReviewConfig = async (req, res) => {
  try {
    const config = await autoReviewService.getConfig()
    response.success(res, config)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新自动审核配置
exports.updateAutoReviewConfig = async (req, res) => {
  try {
    const config = await autoReviewService.updateConfig(req.body)
    response.success(res, config, '配置已更新')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取订单风险评估
exports.getOrderRisk = async (req, res) => {
  try {
    const { orderId } = req.params
    const risk = await autoReviewService.getOrderRisk(orderId)
    if (!risk) {
      return response.notFound(res, '订单不存在')
    }
    response.success(res, risk)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 手动触发预审核
exports.triggerPreReview = async (req, res) => {
  try {
    const result = await autoReviewService.runPreReview()
    response.success(res, result, '预审核完成')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 手动触发超时检查
exports.triggerTimeoutCheck = async (req, res) => {
  try {
    const result = await autoReviewService.runTimeoutAutoApprove()
    response.success(res, result, '超时检查完成')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
