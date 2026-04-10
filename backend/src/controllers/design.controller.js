const { Order, DesignScheme, DesignGroup, DesignGroupFace, DesignDrawing, DesignCdrFile, MeasureFace, User, OrderLog, Notification, OrderAdItem, AdType, Material, Supplier } = require('../models')
const response = require('../utils/response')
const { sequelize } = require('../config/database')
const { Op } = require('sequelize')

// 获取设计任务列表
exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const where = {
      status: { [Op.in]: ['designing', 'design_review'] }  // 只显示设计相关状态
    }

    // 根据角色过滤
    if (req.user.role === 'designer') {
      where.current_handler_id = req.user.id
    }

    // 状态过滤
    if (status === 'designing') {
      where.status = 'designing'
    } else if (status === 'pending' || status === 'design_review') {
      where.status = 'design_review'
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

// 获取设计管理列表（主管/审核员）
exports.getManageList = async (req, res) => {
  try {
    const { status, designer_id, keyword, page = 1, pageSize = 20 } = req.query
    const where = {}

    // 状态过滤
    if (status) {
      where.status = status
    } else {
      // 默认只显示设计相关状态
      where.status = { [Op.in]: ['designing', 'design_review', 'producing'] }
    }

    // 设计师过滤
    if (designer_id) {
      where.current_handler_id = designer_id
    }

    // 关键词搜索
    if (keyword) {
      where[Op.or] = [
        { order_no: { [Op.like]: `%${keyword}%` } },
        { title: { [Op.like]: `%${keyword}%` } }
      ]
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] },
        {
          model: DesignScheme,
          as: 'designScheme',
          include: [
            { model: User, as: 'designer', attributes: ['id', 'real_name'] },
            {
              model: DesignGroup,
              as: 'groups',
              attributes: ['id', 'group_name', 'is_combined', 'sort_order']
            }
          ]
        }
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

// 获取设计师列表
exports.getDesigners = async (req, res) => {
  try {
    const designers = await User.findAll({
      where: { role: 'designer', status: 1 },
      attributes: ['id', 'username', 'real_name', 'phone'],
      order: [['real_name', 'ASC']]
    })
    response.success(res, designers)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取设计管理详情
exports.getManageDetail = async (req, res) => {
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
            { model: User, as: 'designer', attributes: ['id', 'real_name'] },
            {
              model: DesignGroup,
              as: 'groups',
              include: [
                {
                  model: DesignGroupFace,
                  as: 'faceRelations',
                  include: [{ model: MeasureFace, as: 'face' }]
                },
                {
                  model: DesignDrawing,
                  as: 'drawings'
                }
              ]
            },
            {
              model: DesignCdrFile,
              as: 'cdrFiles',
              include: [{ model: MeasureFace, as: 'face' }]
            }
          ]
        }
      ]
    })

    if (!order) {
      return response.notFound(res, '订单不存在')
    }

    response.success(res, order)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 派单给设计师
exports.dispatch = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { handler_id, remark } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (!handler_id) {
      await transaction.rollback()
      return response.error(res, '请指定设计师', 1, 400)
    }

    const oldHandlerId = order.current_handler_id
    await order.update({ current_handler_id: handler_id }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'design_dispatch',
      from_status: order.status,
      to_status: order.status,
      remark: remark || `派单给设计师ID: ${handler_id}`
    }, { transaction })

    // 发送通知
    await Notification.create({
      user_id: handler_id,
      order_id: orderId,
      type: 'dispatch',
      title: '设计任务派单',
      content: `订单 ${order.order_no} 已派单给您进行设计`,
      is_read: false
    }, { transaction })

    await transaction.commit()
    response.success(res, order, '派单成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 审核通过
exports.approve = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { remark } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'design_review') {
      await transaction.rollback()
      return response.error(res, '当前订单状态不允许审核', 1, 400)
    }

    const oldStatus = order.status
    await order.update({ status: 'producing' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'design_approve',
      from_status: oldStatus,
      to_status: 'producing',
      remark: remark || '设计方案审核通过'
    }, { transaction })

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
    const { remark } = req.body

    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    if (order.status !== 'design_review') {
      await transaction.rollback()
      return response.error(res, '当前订单状态不允许驳回', 1, 400)
    }

    const oldStatus = order.status
    await order.update({ status: 'designing' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'design_reject',
      from_status: oldStatus,
      to_status: 'designing',
      remark: remark || '设计方案被驳回'
    }, { transaction })

    // 发送通知给设计师
    if (order.current_handler_id) {
      await Notification.create({
        user_id: order.current_handler_id,
        order_id: orderId,
        type: 'reject',
        title: '设计方案被驳回',
        content: `订单 ${order.order_no} 的设计方案已被驳回，请重新设计。原因：${remark || '无'}`,
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

// 获取设计详情
exports.getDetail = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'real_name', 'phone'] },
        { model: User, as: 'handler', attributes: ['id', 'real_name'] },
        {
          model: OrderAdItem,
          as: 'adItems',
          include: [
            { model: AdType, as: 'adType', attributes: ['id', 'name'] },
            {
              model: MeasureFace,
              as: 'faces',
              include: [
                { model: Material, as: 'material', attributes: ['id', 'name'] },
                { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
              ]
            }
          ]
        },
        {
          model: DesignScheme,
          as: 'designScheme',
          include: [
            { model: User, as: 'designer', attributes: ['id', 'real_name'] },
            {
              model: DesignGroup,
              as: 'groups',
              include: [
                {
                  model: DesignGroupFace,
                  as: 'faceRelations',
                  include: [{ model: MeasureFace, as: 'face' }]
                },
                {
                  model: DesignDrawing,
                  as: 'drawings'
                }
              ]
            },
            {
              model: DesignCdrFile,
              as: 'cdrFiles',
              include: [{ model: MeasureFace, as: 'face' }]
            }
          ]
        }
      ]
    })

    if (!order) {
      return response.notFound(res, '订单不存在')
    }

    response.success(res, order)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 提交设计方案
exports.submitScheme = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { orderId } = req.params
    const { groups, cdrFiles, cdrFile, remark } = req.body

    // 检查订单状态
    const order = await Order.findByPk(orderId, { transaction })
    if (!order) {
      await transaction.rollback()
      return response.notFound(res, '订单不存在')
    }

    // 允许设计中或设计审核状态提交/修改方案
    if (!['designing', 'design_review'].includes(order.status)) {
      await transaction.rollback()
      return response.error(res, '订单状态不允许提交设计方案', 1, 400)
    }

    // 创建/更新设计方案
    let scheme = await DesignScheme.findOne({ where: { order_id: orderId }, transaction })

    if (scheme) {
      await scheme.update({
        designer_id: req.user.id,
        remark,
        cdr_file: cdrFile || scheme.cdr_file
      }, { transaction })
      // 清除旧数据
      const oldGroups = await DesignGroup.findAll({ where: { design_scheme_id: scheme.id }, transaction })
      for (const g of oldGroups) {
        await DesignGroupFace.destroy({ where: { design_group_id: g.id }, transaction })
        await DesignDrawing.destroy({ where: { design_group_id: g.id }, transaction })
      }
      await DesignGroup.destroy({ where: { design_scheme_id: scheme.id }, transaction })
      await DesignCdrFile.destroy({ where: { design_scheme_id: scheme.id }, transaction })
    } else {
      scheme = await DesignScheme.create({
        order_id: orderId,
        designer_id: req.user.id,
        scheme_name: `设计方案-${order.order_no}`,
        remark,
        cdr_file: cdrFile
      }, { transaction })
    }

    // 保存设计图组
    if (groups && groups.length > 0) {
      for (const group of groups) {
        const designGroup = await DesignGroup.create({
          design_scheme_id: scheme.id,
          group_name: group.name,
          width: group.width,
          height: group.height,
          area: ((group.width || 0) * (group.height || 0)) / 1000000, // mm转平方米
          material: group.material,
          is_combined: group.faceIds && group.faceIds.length > 1 ? 1 : 0,
          remark: group.remark
        }, { transaction })

        // 关联测量面
        if (group.faceIds && group.faceIds.length > 0) {
          for (const faceId of group.faceIds) {
            await DesignGroupFace.create({
              design_group_id: designGroup.id,
              measure_face_id: faceId
            }, { transaction })
          }
        }

        // 保存图纸
        if (group.drawings && group.drawings.length > 0) {
          for (const drawing of group.drawings) {
            await DesignDrawing.create({
              design_group_id: designGroup.id,
              file_name: drawing.name,
              file_url: drawing.file_path || drawing.file_url,
              drawing_type: drawing.file_type || '效果图'
            }, { transaction })
          }
        }
      }
    }

    // 保存CDR文件
    if (cdrFiles && cdrFiles.length > 0) {
      for (const cdr of cdrFiles) {
        await DesignCdrFile.create({
          design_scheme_id: scheme.id,
          measure_face_id: cdr.measure_face_id,
          file_name: cdr.file_name,
          file_path: cdr.file_path,
          file_size: cdr.file_size
        }, { transaction })
      }
    }

    // 更新订单状态
    const oldStatus = order.status
    await order.update({ status: 'design_review' }, { transaction })

    // 记录日志
    await OrderLog.create({
      order_id: orderId,
      operator_id: req.user.id,
      action: 'design_submit',
      from_status: oldStatus,
      to_status: 'design_review',
      remark: '提交设计方案'
    }, { transaction })

    await transaction.commit()
    response.success(res, scheme, '设计方案提交成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 获取设计方案
exports.getScheme = async (req, res) => {
  try {
    const { orderId } = req.params

    const scheme = await DesignScheme.findOne({
      where: { order_id: orderId },
      include: [
        { model: User, as: 'designer', attributes: ['id', 'real_name', 'phone'] },
        {
          model: DesignGroup,
          as: 'groups',
          include: [
            {
              model: DesignGroupFace,
              as: 'faceRelations',
              include: [{ model: MeasureFace, as: 'face' }]
            },
            {
              model: DesignDrawing,
              as: 'drawings'
            }
          ]
        },
        {
          model: DesignCdrFile,
          as: 'cdrFiles'
        }
      ]
    })

    if (!scheme) {
      return response.notFound(res, '设计方案不存在')
    }

    response.success(res, scheme)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
