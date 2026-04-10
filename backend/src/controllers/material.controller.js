const { Material } = require('../models')
const response = require('../utils/response')

// 材质列表
exports.getList = async (req, res) => {
  try {
    const { page = 1, pageSize = 100 } = req.query

    const { count, rows } = await Material.findAndCountAll({
      where: { status: 1 },
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    })

    response.success(res, { total: count, list: rows, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 材质详情
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params

    const material = await Material.findByPk(id)

    if (!material) {
      return response.notFound(res, '材质不存在')
    }

    response.success(res, material)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 创建材质
exports.create = async (req, res) => {
  try {
    const { name, code, unit, price, description } = req.body

    const material = await Material.create({ name, code, unit, price, description })
    response.success(res, material, '创建成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 更新材质
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, unit, price, description, status } = req.body

    const material = await Material.findByPk(id)
    if (!material) {
      return response.notFound(res, '材质不存在')
    }

    await material.update({ name, code, unit, price, description, status })
    response.success(res, material, '更新成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 删除材质
exports.delete = async (req, res) => {
  try {
    const { id } = req.params

    const material = await Material.findByPk(id)
    if (!material) {
      return response.notFound(res, '材质不存在')
    }

    await material.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
