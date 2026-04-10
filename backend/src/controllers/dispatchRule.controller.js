const { DispatchRule, User, Province, District, Group } = require('../models')
const response = require('../utils/response')
const { sequelize } = require('../config/database')

// 获取规则列表
exports.getList = async (req, res) => {
  try {
    const { stage, enabled } = req.query

    const where = {}
    if (stage) where.stage = stage
    if (enabled !== undefined) where.enabled = enabled === 'true'

    const rules = await DispatchRule.findAll({
      where,
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      include: [
        { model: Province, as: 'province', attributes: ['id', 'name'] },
        { model: District, as: 'district', attributes: ['id', 'name'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: User, as: 'targetUser', attributes: ['id', 'real_name'] }
      ]
    })

    response.success(res, rules)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 创建规则
exports.create = async (req, res) => {
  try {
    const rule = await DispatchRule.create(req.body)
    response.success(res, rule, '创建成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新规则
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const rule = await DispatchRule.findByPk(id)
    if (!rule) {
      return response.notFound(res, '规则不存在')
    }

    await rule.update(req.body)
    response.success(res, rule, '更新成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 删除规则
exports.delete = async (req, res) => {
  try {
    const { id } = req.params
    const rule = await DispatchRule.findByPk(id)
    if (!rule) {
      return response.notFound(res, '规则不存在')
    }

    await rule.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 切换启用状态
exports.toggle = async (req, res) => {
  try {
    const { id } = req.params
    const rule = await DispatchRule.findByPk(id)
    if (!rule) {
      return response.notFound(res, '规则不存在')
    }

    await rule.update({ enabled: !rule.enabled })
    response.success(res, rule, rule.enabled ? '已启用' : '已禁用')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
