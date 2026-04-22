const logger = require('../utils/logger');
/**
 * 自动审核服务
 * 方案B: 智能预审核风险评估
 * 方案C: 超时自动通过/转派
 */
const { Op } = require('sequelize')
const { sequelize } = require('../config/database')
const cacheService = require('./cache.service')

// 默认配置
const DEFAULT_CONFIG = {
  // 预审核开关
  pre_review_enabled: false,
  // 预审核自动通过阈值（风险分 <= 此值则自动通过）
  pre_review_auto_approve_threshold: 20,
  // 预审核标记高风险阈值（风险分 >= 此值则标记为高风险需人工审核）
  pre_review_high_risk_threshold: 60,

  // 超时自动通过开关
  timeout_auto_approve_enabled: false,
  // 超时时间（小时），超过此时间未处理则自动通过
  timeout_hours: 48,
  // 超时后动作: 'auto_approve' = 自动通过, 'escalate' = 转派给管理员
  timeout_action: 'auto_approve',
  // 超时转派目标用户ID（当 action=escalate 时使用）
  timeout_escalate_user_id: null,

  // 风险评估权重
  risk_weights: {
    no_address: 30,          // 无详细地址
    no_photo: 25,            // 无现场照片
    no_customer_history: 15, // 新客户（无历史订单）
    incomplete_form: 20,     // 表单字段缺失
    no_location: 10          // 无经纬度坐标
  }
}

/**
 * 获取自动审核配置
 */
async function getConfig() {
  try {
    const cached = await cacheService.get('auto_review_config')
    if (cached) return cached

    const { SystemConfig } = require('../models')
    const config = await SystemConfig.findOne({
      where: { config_key: 'auto_review_config' }
    })

    let result = { ...DEFAULT_CONFIG }
    if (config && config.config_value) {
      try {
        const parsed = JSON.parse(config.config_value)
        result = { ...result, ...parsed }
      } catch (e) {
        logger.error('解析自动审核配置失败:', e)
      }
    }

    await cacheService.set('auto_review_config', result, 300)
    return result
  } catch (err) {
    logger.error('获取自动审核配置失败:', err)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 更新自动审核配置
 */
async function updateConfig(newConfig) {
  const { SystemConfig } = require('../models')
  await SystemConfig.upsert({
    config_key: 'auto_review_config',
    config_value: JSON.stringify(newConfig),
    config_type: 'json',
    description: '自动审核配置（预审核+超时自动通过）',
    category: 'auto_review'
  })
  await cacheService.del('auto_review_config')
  return newConfig
}

/**
 * 风险评估 - 方案B: 智能预审核
 * 对 pending_review 状态的订单进行风险评估，返回风险分数和风险标签
 * @param {Object} order - 订单对象（需包含关联数据）
 * @returns {Object} { score, level, tags, canAutoApprove }
 */
async function assessRisk(order) {
  const config = await getConfig()
  const weights = config.risk_weights || DEFAULT_CONFIG.risk_weights

  let score = 0
  const tags = []

  // 1. 检查地址完整性
  if (!order.address || order.address.trim().length < 10) {
    score += weights.no_address
    tags.push({ code: 'no_address', label: '地址不完整', severity: 'high' })
  }

  // 2. 检查现场照片
  const photoCount = Array.isArray(order.photos) ? order.photos.length : 0
  if (photoCount === 0) {
    score += weights.no_photo
    tags.push({ code: 'no_photo', label: '无现场照片', severity: 'high' })
  } else if (photoCount < 3) {
    score += Math.floor(weights.no_photo / 2)
    tags.push({ code: 'few_photos', label: `仅${photoCount}张照片`, severity: 'medium' })
  }

  // 3. 检查客户历史
  if (order.customer_id) {
    const { Order } = require('../models')
    const historyCount = await Order.count({
      where: {
        customer_id: order.customer_id,
        status: { [Op.in]: ['archived', 'designing', 'design_review', 'producing', 'checking', 'installing', 'install_review'] }
      }
    })
    if (historyCount === 0) {
      score += weights.no_customer_history
      tags.push({ code: 'new_customer', label: '新客户', severity: 'low' })
    }
  }

  // 4. 检查表单完整性
  if (order.form_data) {
    const formData = order.form_data
    const requiredFields = ['company', 'contact_name', 'contact_phone']
    const missingFields = requiredFields.filter(f => !formData[f] || String(formData[f]).trim() === '')
    if (missingFields.length > 0) {
      score += weights.incomplete_form
      tags.push({ code: 'incomplete_form', label: `缺少${missingFields.length}项必填`, severity: 'medium' })
    }
  }

  // 5. 检查经纬度
  if (!order.latitude || !order.longitude) {
    score += weights.no_location
    tags.push({ code: 'no_location', label: '无坐标', severity: 'low' })
  }

  // 风险等级
  let level = 'low'
  if (score >= (config.pre_review_high_risk_threshold || DEFAULT_CONFIG.pre_review_high_risk_threshold)) {
    level = 'high'
  } else if (score >= (config.pre_review_auto_approve_threshold || DEFAULT_CONFIG.pre_review_auto_approve_threshold)) {
    level = 'medium'
  }

  const threshold = config.pre_review_auto_approve_threshold || DEFAULT_CONFIG.pre_review_auto_approve_threshold
  const canAutoApprove = config.pre_review_enabled && score <= threshold

  return {
    score: Math.min(score, 100),
    level,
    tags,
    canAutoApprove,
    config: {
      threshold,
      highRiskThreshold: config.pre_review_high_risk_threshold || DEFAULT_CONFIG.pre_review_high_risk_threshold
    }
  }
}

/**
 * 批量预审核 - 对所有 pending_review 订单进行风险评估
 */
async function runPreReview() {
  const config = await getConfig()
  if (!config.pre_review_enabled) return { processed: 0, autoApproved: 0, flagged: 0 }

  const { Order, OrderLog, User } = require('../models')
  const orders = await Order.findAll({
    where: { status: 'pending_review' },
    include: [
      { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] }
    ],
    order: [['created_at', 'ASC']]
  })

  let processed = 0
  let autoApproved = 0
  let flagged = 0

  for (const order of orders) {
    try {
      const risk = await assessRisk(order)
      processed++

      // 低风险且满足自动通过条件 -> 自动通过
      if (risk.canAutoApprove && risk.level === 'low') {
        const transaction = await sequelize.transaction()
        try {
          await order.update({
            status: 'designing'
          }, { transaction })

          await OrderLog.create({
            order_id: order.id,
            operator_id: 0, // 0 = 系统自动操作
            action: 'auto_approve',
            from_status: 'pending_review',
            to_status: 'designing',
            remark: `预审核自动通过（风险分: ${risk.score}）`
          }, { transaction })

          await transaction.commit()
          autoApproved++
          logger.info(`[预审核] 订单 ${order.order_no} 自动通过，风险分: ${risk.score}`)
        } catch (err) {
          await transaction.rollback()
          logger.error(`[预审核] 订单 ${order.order_no} 自动通过失败:`, err.message)
        }
      } else if (risk.level === 'high') {
        flagged++
        logger.info(`[预审核] 订单 ${order.order_no} 标记高风险，风险分: ${risk.score}，标签: ${risk.tags.map(t => t.label).join(', ')}`)
      }
    } catch (err) {
      logger.error(`[预审核] 订单 ${order.order_no} 评估失败:`, err.message)
    }
  }

  return { processed, autoApproved, flagged }
}

/**
 * 超时自动通过/转派 - 方案C
 * 检查超过 timeout_hours 未处理的 pending_review 订单
 */
async function runTimeoutAutoApprove() {
  const config = await getConfig()
  if (!config.timeout_auto_approve_enabled) return { processed: 0, actioned: 0, escalated: 0 }

  const { Order, OrderLog } = require('../models')
  const timeoutDate = new Date(Date.now() - (config.timeout_hours || 48) * 60 * 60 * 1000)

  const orders = await Order.findAll({
    where: {
      status: 'pending_review',
      created_at: { [Op.lt]: timeoutDate }
    },
    order: [['created_at', 'ASC']]
  })

  let processed = 0
  let actioned = 0
  let escalated = 0

  for (const order of orders) {
    try {
      processed++
      const transaction = await sequelize.transaction()

      try {
        if (config.timeout_action === 'auto_approve') {
          await order.update({ status: 'designing' }, { transaction })
          await OrderLog.create({
            order_id: order.id,
            operator_id: 0,
            action: 'timeout_auto_approve',
            from_status: 'pending_review',
            to_status: 'designing',
            remark: `超时自动通过（等待超过${config.timeout_hours}小时）`
          }, { transaction })
          actioned++
          logger.info(`[超时] 订单 ${order.order_no} 超时自动通过`)
        } else if (config.timeout_action === 'escalate' && config.timeout_escalate_user_id) {
          await order.update({
            current_handler_id: config.timeout_escalate_user_id
          }, { transaction })
          await OrderLog.create({
            order_id: order.id,
            operator_id: 0,
            action: 'timeout_escalate',
            from_status: 'pending_review',
            to_status: 'pending_review',
            remark: `超时转派给用户ID ${config.timeout_escalate_user_id}`
          }, { transaction })
          escalated++
          logger.info(`[超时] 订单 ${order.order_no} 超时转派给用户 ${config.timeout_escalate_user_id}`)
        }

        await transaction.commit()
      } catch (err) {
        await transaction.rollback()
        logger.error(`[超时] 订单 ${order.order_no} 处理失败:`, err.message)
      }
    } catch (err) {
      logger.error(`[超时] 订单 ${order.order_no} 处理异常:`, err.message)
    }
  }

  return { processed, actioned, escalated }
}

/**
 * 获取单个订单的风险评估（供 API 调用）
 */
async function getOrderRisk(orderId) {
  const { Order, User } = require('../models')
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] }
    ]
  })
  if (!order) return null
  return await assessRisk(order)
}

/**
 * 启动定时任务
 */
function startScheduler() {
  // 使用 setInterval 作为轻量级调度器
  // 每 30 分钟执行一次预审核
  const preReviewInterval = setInterval(async () => {
    try {
      const result = await runPreReview()
      if (result.processed > 0) {
        logger.info(`[自动审核] 预审核完成: 处理${result.processed}单，自动通过${result.autoApproved}单，标记高风险${result.flagged}单`)
      }
    } catch (err) {
      logger.error('[自动审核] 预审核任务异常:', err.message)
    }
  }, 30 * 60 * 1000) // 30分钟

  // 每 1 小时执行一次超时检查
  const timeoutInterval = setInterval(async () => {
    try {
      const result = await runTimeoutAutoApprove()
      if (result.processed > 0) {
        logger.info(`[自动审核] 超时检查完成: 处理${result.processed}单，自动通过${result.actioned}单，转派${result.escalated}单`)
      }
    } catch (err) {
      logger.error('[自动审核] 超时检查任务异常:', err.message)
    }
  }, 60 * 60 * 1000) // 1小时

  // 启动时立即执行一次
  setTimeout(async () => {
    try {
      const preResult = await runPreReview()
      const timeoutResult = await runTimeoutAutoApprove()
      if (preResult.processed > 0 || timeoutResult.processed > 0) {
        logger.info(`[自动审核] 初始化检查完成: 预审核${preResult.processed}单，超时检查${timeoutResult.processed}单`)
      }
    } catch (err) {
      logger.error('[自动审核] 初始化检查异常:', err.message)
    }
  }, 5000) // 启动后 5 秒执行

  return { preReviewInterval, timeoutInterval }
}

module.exports = {
  getConfig,
  updateConfig,
  assessRisk,
  runPreReview,
  runTimeoutAutoApprove,
  getOrderRisk,
  startScheduler,
  DEFAULT_CONFIG
}
