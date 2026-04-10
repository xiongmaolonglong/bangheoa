const { AdType, AdTypeFace, Face, AttributeTemplate, AttributeField, Order, sequelize } = require('../models')
const response = require('../utils/response')
const { Op } = require('sequelize')

// 广告类型列表
exports.getList = async (req, res) => {
  try {
    const { page = 1, pageSize = 100 } = req.query

    const { count, rows } = await AdType.findAndCountAll({
      where: { status: 1 },
      include: [{
        model: AdTypeFace,
        as: 'faces',
        attributes: ['id', 'ad_type_id', 'face_id', 'face_name', 'face_icon', 'template_id', 'inline_attributes', 'sort_order', 'status'],
        include: [{
          model: Face,
          as: 'faceConfig',
          attributes: ['id', 'name', 'code']
        }, {
          model: AttributeTemplate,
          as: 'template',
          attributes: ['id', 'name']
        }]
      }],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    })

    const list = rows.map(item => {
      const data = item.toJSON()
      if (data.faces) {
        data.faces = data.faces.map(face => {
          if (face.inline_attributes && typeof face.inline_attributes === 'string') {
            face.inline_attributes = JSON.parse(face.inline_attributes)
          }
          return face
        })
      }
      return data
    })

    response.success(res, { total: count, list, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取用量统计
exports.getUsage = async (req, res) => {
  try {
    const adTypes = await AdType.findAll({
      attributes: ['id', 'name'],
      include: [{
        model: Order,
        as: 'orders',
        attributes: []
      }],
      includeIgnoreAttributes: false,
      group: ['AdType.id'],
      raw: true
    })

    const usageMap = {}
    adTypes.forEach(t => {
      usageMap[t.id] = parseInt(t['orders.count'] || 0)
    })

    response.success(res, usageMap)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 广告类型详情
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params

    const adType = await AdType.findByPk(id, {
      include: [{
        model: AdTypeFace,
        as: 'faces',
        include: [{
          model: Face,
          as: 'faceConfig',
          attributes: ['id', 'name', 'code']
        }, {
          model: AttributeTemplate,
          as: 'template',
          include: [{
            model: AttributeField,
            as: 'fields'
          }]
        }]
      }]
    })

    if (!adType) {
      return response.notFound(res, '广告类型不存在')
    }

    response.success(res, adType)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 获取广告类型完整配置
exports.getConfig = async (req, res) => {
  try {
    const { id } = req.params

    const adType = await AdType.findByPk(id, {
      attributes: ['id', 'name', 'description', 'icon'],
      include: [{
        model: AdTypeFace,
        as: 'faces',
        where: { status: 1 },
        required: false,
        attributes: ['id', 'ad_type_id', 'face_id', 'face_name', 'face_icon', 'template_id', 'inline_attributes', 'sort_order', 'status'],
        include: [{
          model: Face,
          as: 'faceConfig',
          attributes: ['id', 'name', 'code']
        }, {
          model: AttributeTemplate,
          as: 'template',
          include: [{
            model: AttributeField,
            as: 'fields',
            where: { status: 1 },
            required: false,
            order: [['sort_order', 'ASC']]
          }]
        }],
        order: [['sort_order', 'ASC']]
      }]
    })

    if (!adType) {
      return response.notFound(res, '广告类型不存在')
    }

    const result = adType.toJSON()
    result.faces = result.faces.map(face => {
      if (!face.template && face.inline_attributes) {
        const attrs = typeof face.inline_attributes === 'string'
          ? JSON.parse(face.inline_attributes)
          : face.inline_attributes
        face.template = {
          id: null,
          name: '自定义属性',
          fields: attrs
        }
      }
      return face
    })

    response.success(res, result)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 创建广告类型
exports.create = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { name, code, icon, description, sort_order, status, faces } = req.body

    if (!name) {
      return response.error(res, '名称不能为空')
    }

    let sortOrder = sort_order
    if (sortOrder === undefined) {
      const maxOrder = await AdType.max('sort_order') || 0
      sortOrder = maxOrder + 1
    }

    const adType = await AdType.create({
      name,
      code,
      icon,
      description,
      sort_order: sortOrder,
      status: status !== undefined ? status : 1
    }, { transaction })

    if (faces && faces.length > 0) {
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i]
        await AdTypeFace.create({
          ad_type_id: adType.id,
          face_id: face.face_id || null,
          face_name: face.face_name,
          face_icon: face.face_icon || null,
          template_id: face.template_id || null,
          inline_attributes: face.inline_attributes || null,
          sort_order: i + 1,
          status: 1
        }, { transaction })
      }
    }

    await transaction.commit()
    response.success(res, adType, '创建成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 更新广告类型
exports.update = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = req.params
    const { name, code, icon, description, sort_order, status, faces } = req.body

    const adType = await AdType.findByPk(id)
    if (!adType) {
      return response.notFound(res, '广告类型不存在')
    }

    await adType.update({
      name: name || adType.name,
      code: code !== undefined ? code : adType.code,
      icon: icon !== undefined ? icon : adType.icon,
      description: description !== undefined ? description : adType.description,
      sort_order: sort_order !== undefined ? sort_order : adType.sort_order,
      status: status !== undefined ? status : adType.status
    }, { transaction })

    if (faces !== undefined) {
      await AdTypeFace.destroy({ where: { ad_type_id: id }, transaction })

      if (faces.length > 0) {
        for (let i = 0; i < faces.length; i++) {
          const face = faces[i]
          await AdTypeFace.create({
            ad_type_id: id,
            face_id: face.face_id || null,
            face_name: face.face_name,
            face_icon: face.face_icon || null,
            template_id: face.template_id || null,
            inline_attributes: face.inline_attributes || null,
            sort_order: i + 1,
            status: 1
          }, { transaction })
        }
      }
    }

    await transaction.commit()
    response.success(res, adType, '更新成功')
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}

// 删除广告类型
exports.delete = async (req, res) => {
  try {
    const { id } = req.params

    const adType = await AdType.findByPk(id)
    if (!adType) {
      return response.notFound(res, '广告类型不存在')
    }

    await AdTypeFace.destroy({ where: { ad_type_id: id } })
    await adType.destroy()
    response.success(res, null, '删除成功')
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 导出配置
exports.exportConfig = async (req, res) => {
  try {
    const adTypes = await AdType.findAll({
      where: { status: 1 },
      include: [{
        model: AdTypeFace,
        as: 'faces',
        where: { status: 1 },
        required: false,
        order: [['sort_order', 'ASC']],
        attributes: ['face_name', 'face_icon', 'inline_attributes', 'sort_order']
      }],
      order: [['sort_order', 'ASC']],
      attributes: ['name', 'icon', 'description', 'sort_order']
    })

    const data = adTypes.map(t => t.toJSON())
    // 清除内联属性的 id
    data.forEach(t => {
      if (t.faces) {
        t.faces.forEach(f => {
          if (f.inline_attributes && Array.isArray(f.inline_attributes)) {
            f.inline_attributes.forEach(a => { delete a.id })
          }
        })
      }
    })

    response.success(res, data)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}

// 导入配置
exports.importConfig = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { data } = req.body

    if (!Array.isArray(data)) {
      return response.error(res, '数据格式错误')
    }

    let imported = 0
    for (const adTypeData of data) {
      const { name, icon, description, sort_order, faces } = adTypeData
      if (!name) continue

      // 检查是否已存在同名类型
      const exist = await AdType.findOne({ where: { name }, transaction })
      if (exist) continue

      const adType = await AdType.create({
        name,
        icon,
        description,
        sort_order: sort_order || 0,
        status: 1
      }, { transaction })

      if (faces && faces.length > 0) {
        for (let i = 0; i < faces.length; i++) {
          const face = faces[i]
          await AdTypeFace.create({
            ad_type_id: adType.id,
            face_id: face.face_id || null,
            face_name: face.face_name,
            face_icon: face.face_icon || null,
            template_id: face.template_id || null,
            inline_attributes: face.inline_attributes || null,
            sort_order: i + 1,
            status: 1
          }, { transaction })
        }
      }
      imported++
    }

    await transaction.commit()
    response.success(res, { imported }, `成功导入 ${imported} 个广告类型`)
  } catch (err) {
    await transaction.rollback()
    response.error(res, err.message, 1, 500)
  }
}
