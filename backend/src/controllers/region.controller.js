const { Province, District, Group } = require('../models')
const response = require('../utils/response')

// 省份列表
exports.getProvinces = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      where: { status: 1 },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    })
    response.success(res, provinces)
  } catch (err) {
    response.serverError(res, err.message)
  }
}

// 创建省份
exports.createProvince = async (req, res) => {
  try {
    const { name, code } = req.body
    const province = await Province.create({ name, code })
    response.success(res, province)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 更新省份
exports.updateProvince = async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, status, sort_order } = req.body
    const province = await Province.findByPk(id)
    if (!province) {
      return response.notFound(res, '省份不存在')
    }
    await province.update({ name, code, status, sort_order })
    response.success(res, province)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 删除省份
exports.deleteProvince = async (req, res) => {
  try {
    const { id } = req.params
    const province = await Province.findByPk(id)
    if (!province) {
      return response.notFound(res, '省份不存在')
    }
    await province.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message)
  }
}

// 分区列表
exports.getDistricts = async (req, res) => {
  try {
    const { provinceId } = req.params
    const districts = await District.findAll({
      where: { province_id: provinceId, status: 1 },
      include: [{ model: Province, as: 'province' }],
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    })
    response.success(res, districts)
  } catch (err) {
    response.serverError(res, err.message)
  }
}

// 创建分区
exports.createDistrict = async (req, res) => {
  try {
    const { province_id, name, code, leader_id } = req.body
    const district = await District.create({ province_id, name, code, leader_id })
    response.success(res, district)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 更新分区
exports.updateDistrict = async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, leader_id, status, sort_order } = req.body
    const district = await District.findByPk(id)
    if (!district) {
      return response.notFound(res, '分区不存在')
    }
    await district.update({ name, code, leader_id, status, sort_order })
    response.success(res, district)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 删除分区
exports.deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params
    const district = await District.findByPk(id)
    if (!district) {
      return response.notFound(res, '分区不存在')
    }
    await district.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message)
  }
}

// 小组列表
exports.getGroups = async (req, res) => {
  try {
    const { districtId } = req.params
    const groups = await Group.findAll({
      where: { district_id: districtId, status: 1 },
      include: [{ model: District, as: 'district' }],
      order: [['sort_order', 'ASC'], ['code', 'ASC']]
    })
    response.success(res, groups)
  } catch (err) {
    response.serverError(res, err.message)
  }
}

// 创建小组
exports.createGroup = async (req, res) => {
  try {
    const { district_id, name, code, leader_id } = req.body
    const group = await Group.create({ district_id, name, code, leader_id })
    response.success(res, group)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 更新小组
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, leader_id, status, sort_order } = req.body
    const group = await Group.findByPk(id)
    if (!group) {
      return response.notFound(res, '小组不存在')
    }
    await group.update({ name, code, leader_id, status, sort_order })
    response.success(res, group)
  } catch (err) {
    response.error(res, err.message)
  }
}

// 删除小组
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params
    const group = await Group.findByPk(id)
    if (!group) {
      return response.notFound(res, '小组不存在')
    }
    await group.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message)
  }
}

// 完整地区树
exports.getRegionTree = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      where: { status: 1 },
      include: [{
        model: District,
        as: 'districts',
        where: { status: 1 },
        required: false,
        include: [{
          model: Group,
          as: 'groups',
          where: { status: 1 },
          required: false
        }]
      }],
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    })
    response.success(res, provinces)
  } catch (err) {
    response.serverError(res, err.message)
  }
}
