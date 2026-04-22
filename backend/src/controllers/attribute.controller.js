const logger = require('../utils/logger');
const response = require('../utils/response');
const { AttributeTemplate, AttributeField, sequelize } = require('../models');

/**
 * 属性模板控制器
 */
const attributeController = {
  // ==================== 模板管理 ====================

  /**
   * 获取模板列表
   */
  getTemplates: async (req, res) => {
    try {
      const templates = await AttributeTemplate.findAll({
        include: [{
          model: AttributeField,
          as: 'fields',
          where: { status: 1 },
          required: false,
          order: [['sort_order', 'ASC']]
        }],
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });
      return response.success(res, templates);
    } catch (error) {
      logger.error('获取模板列表错误:', error);
      return response.serverError(res, '获取模板列表失败');
    }
  },

  /**
   * 获取模板详情
   */
  getTemplateById: async (req, res) => {
    try {
      const { id } = req.params;
      const template = await AttributeTemplate.findByPk(id, {
        include: [{
          model: AttributeField,
          as: 'fields',
          order: [['sort_order', 'ASC']]
        }]
      });
      if (!template) {
        return response.notFound(res, '模板不存在');
      }
      return response.success(res, template);
    } catch (error) {
      logger.error('获取模板详情错误:', error);
      return response.serverError(res, '获取模板详情失败');
    }
  },

  /**
   * 创建模板
   */
  createTemplate: async (req, res) => {
    try {
      const { name, description, sort_order, status } = req.body;

      if (!name) {
        return response.error(res, '模板名称不能为空');
      }

      let sortOrder = sort_order;
      if (sortOrder === undefined) {
        const maxOrder = await AttributeTemplate.max('sort_order') || 0;
        sortOrder = maxOrder + 1;
      }

      const template = await AttributeTemplate.create({
        name,
        description,
        sort_order: sortOrder,
        status: status !== undefined ? status : 1
      });

      return response.success(res, template, '创建成功');
    } catch (error) {
      logger.error('创建模板错误:', error);
      return response.serverError(res, '创建模板失败');
    }
  },

  /**
   * 更新模板
   */
  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, sort_order, status } = req.body;

      const template = await AttributeTemplate.findByPk(id);
      if (!template) {
        return response.notFound(res, '模板不存在');
      }

      await template.update({
        name: name || template.name,
        description: description !== undefined ? description : template.description,
        sort_order: sort_order !== undefined ? sort_order : template.sort_order,
        status: status !== undefined ? status : template.status
      });

      return response.success(res, template, '更新成功');
    } catch (error) {
      logger.error('更新模板错误:', error);
      return response.serverError(res, '更新模板失败');
    }
  },

  /**
   * 删除模板
   */
  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;

      const template = await AttributeTemplate.findByPk(id);
      if (!template) {
        return response.notFound(res, '模板不存在');
      }

      // 删除模板下的所有字段
      await AttributeField.destroy({ where: { template_id: id } });
      await template.destroy();

      return response.success(res, null, '删除成功');
    } catch (error) {
      logger.error('删除模板错误:', error);
      return response.serverError(res, '删除模板失败');
    }
  },

  // ==================== 字段管理 ====================

  /**
   * 获取字段列表
   */
  getFields: async (req, res) => {
    try {
      const { template_id } = req.query;

      const where = {};
      if (template_id) {
        where.template_id = template_id;
      }

      const fields = await AttributeField.findAll({
        where,
        order: [['template_id', 'ASC'], ['sort_order', 'ASC']]
      });

      return response.success(res, fields);
    } catch (error) {
      logger.error('获取字段列表错误:', error);
      return response.serverError(res, '获取字段列表失败');
    }
  },

  /**
   * 创建字段
   */
  createField: async (req, res) => {
    try {
      const { template_id, field_name, field_key, field_type, options, unit, is_required, default_value, placeholder, sort_order, status } = req.body;

      if (!template_id || !field_name || !field_key) {
        return response.error(res, '模板ID、字段名称和字段标识不能为空');
      }

      // 检查字段标识是否已存在
      const existField = await AttributeField.findOne({
        where: { template_id, field_key }
      });
      if (existField) {
        return response.error(res, '字段标识已存在');
      }

      let sortOrder = sort_order;
      if (sortOrder === undefined) {
        const maxOrder = await AttributeField.max('sort_order', {
          where: { template_id }
        }) || 0;
        sortOrder = maxOrder + 1;
      }

      const field = await AttributeField.create({
        template_id,
        field_name,
        field_key,
        field_type: field_type || 'text',
        options,
        unit,
        is_required: is_required || 0,
        default_value,
        placeholder,
        sort_order: sortOrder,
        status: status !== undefined ? status : 1
      });

      return response.success(res, field, '创建成功');
    } catch (error) {
      logger.error('创建字段错误:', error);
      return response.serverError(res, '创建字段失败');
    }
  },

  /**
   * 更新字段
   */
  updateField: async (req, res) => {
    try {
      const { id } = req.params;
      const { field_name, field_key, field_type, options, unit, is_required, default_value, placeholder, sort_order, status } = req.body;

      const field = await AttributeField.findByPk(id);
      if (!field) {
        return response.notFound(res, '字段不存在');
      }

      // 如果修改字段标识，检查是否重复
      if (field_key && field_key !== field.field_key) {
        const existField = await AttributeField.findOne({
          where: { template_id: field.template_id, field_key }
        });
        if (existField) {
          return response.error(res, '字段标识已存在');
        }
      }

      await field.update({
        field_name: field_name || field.field_name,
        field_key: field_key || field.field_key,
        field_type: field_type || field.field_type,
        options: options !== undefined ? options : field.options,
        unit: unit !== undefined ? unit : field.unit,
        is_required: is_required !== undefined ? is_required : field.is_required,
        default_value: default_value !== undefined ? default_value : field.default_value,
        placeholder: placeholder !== undefined ? placeholder : field.placeholder,
        sort_order: sort_order !== undefined ? sort_order : field.sort_order,
        status: status !== undefined ? status : field.status
      });

      return response.success(res, field, '更新成功');
    } catch (error) {
      logger.error('更新字段错误:', error);
      return response.serverError(res, '更新字段失败');
    }
  },

  /**
   * 删除字段
   */
  deleteField: async (req, res) => {
    try {
      const { id } = req.params;

      const field = await AttributeField.findByPk(id);
      if (!field) {
        return response.notFound(res, '字段不存在');
      }

      await field.destroy();
      return response.success(res, null, '删除成功');
    } catch (error) {
      logger.error('删除字段错误:', error);
      return response.serverError(res, '删除字段失败');
    }
  }
};

module.exports = attributeController;
