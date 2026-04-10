const response = require('../utils/response');
const { FormGroup, FormField, FormFeature } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * 表单配置控制器
 */
const formController = {
  /**
   * 获取完整表单配置
   */
  getConfig: async (req, res) => {
    try {
      const groups = await FormGroup.findAll({
        where: { status: 1 },
        include: [{
          model: FormField,
          as: 'fields',
          where: { status: 1 },
          required: false,
          order: [['sort_order', 'ASC']]
        }],
        order: [['sort_order', 'ASC']]
      });

      return response.success(res, groups);
    } catch (error) {
      console.error('获取表单配置错误:', error);
      return response.serverError(res, '获取表单配置失败');
    }
  },

  // ==================== 分组管理 ====================

  /**
   * 获取分组列表
   */
  getGroups: async (req, res) => {
    try {
      const groups = await FormGroup.findAll({
        include: [{
          model: FormField,
          as: 'fields',
          required: false
        }],
        order: [['sort_order', 'ASC']]
      });

      return response.success(res, groups);
    } catch (error) {
      console.error('获取分组列表错误:', error);
      return response.serverError(res, '获取分组列表失败');
    }
  },

  /**
   * 创建分组
   */
  createGroup: async (req, res) => {
    try {
      const { name, sort_order, status } = req.body;

      if (!name) {
        return response.error(res, '分组名称不能为空');
      }

      // 获取最大排序值
      let sortOrder = sort_order;
      if (sortOrder === undefined) {
        const maxOrder = await FormGroup.max('sort_order') || 0;
        sortOrder = maxOrder + 1;
      }

      const group = await FormGroup.create({
        name,
        sort_order: sortOrder,
        status: status !== undefined ? status : 1
      });

      return response.success(res, group, '创建成功');
    } catch (error) {
      console.error('创建分组错误:', error);
      return response.serverError(res, '创建分组失败');
    }
  },

  /**
   * 更新分组
   */
  updateGroup: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, sort_order, status } = req.body;

      const group = await FormGroup.findByPk(id);
      if (!group) {
        return response.notFound(res, '分组不存在');
      }

      await group.update({
        name: name || group.name,
        sort_order: sort_order !== undefined ? sort_order : group.sort_order,
        status: status !== undefined ? status : group.status
      });

      return response.success(res, group, '更新成功');
    } catch (error) {
      console.error('更新分组错误:', error);
      return response.serverError(res, '更新分组失败');
    }
  },

  /**
   * 删除分组
   */
  deleteGroup: async (req, res) => {
    try {
      const { id } = req.params;

      const group = await FormGroup.findByPk(id);
      if (!group) {
        return response.notFound(res, '分组不存在');
      }

      // 删除分组下的所有字段
      await FormField.destroy({ where: { group_id: id } });
      await group.destroy();

      return response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除分组错误:', error);
      return response.serverError(res, '删除分组失败');
    }
  },

  // ==================== 字段管理 ====================

  /**
   * 获取字段列表
   */
  getFields: async (req, res) => {
    try {
      const { group_id } = req.query;

      const where = {};
      if (group_id) {
        where.group_id = group_id;
      }

      const fields = await FormField.findAll({
        where,
        order: [['group_id', 'ASC'], ['sort_order', 'ASC']]
      });

      return response.success(res, fields);
    } catch (error) {
      console.error('获取字段列表错误:', error);
      return response.serverError(res, '获取字段列表失败');
    }
  },

  /**
   * 创建字段
   */
  createField: async (req, res) => {
    try {
      const {
        group_id,
        field_name,
        field_key,
        field_type,
        options,
        default_value,
        placeholder,
        is_required,
        sort_order,
        status
      } = req.body;

      if (!group_id || !field_name || !field_key) {
        return response.error(res, '分组ID、字段名称和字段标识不能为空');
      }

      // 检查字段标识是否已存在
      const existField = await FormField.findOne({
        where: { group_id, field_key }
      });
      if (existField) {
        return response.error(res, '字段标识已存在');
      }

      // 获取最大排序值
      let sortOrder = sort_order;
      if (sortOrder === undefined) {
        const maxOrder = await FormField.max('sort_order', {
          where: { group_id }
        }) || 0;
        sortOrder = maxOrder + 1;
      }

      const field = await FormField.create({
        group_id,
        field_name,
        field_key,
        field_type: field_type || 'text',
        options,
        default_value,
        placeholder,
        is_required: is_required || 0,
        sort_order: sortOrder,
        status: status !== undefined ? status : 1
      });

      return response.success(res, field, '创建成功');
    } catch (error) {
      console.error('创建字段错误:', error);
      return response.serverError(res, '创建字段失败');
    }
  },

  /**
   * 更新字段
   */
  updateField: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        field_name,
        field_key,
        field_type,
        options,
        default_value,
        placeholder,
        is_required,
        sort_order,
        status
      } = req.body;

      console.log(`[更新字段] ID=${id}, field_name=${field_name}, field_type=${field_type}, options=`, options);

      const field = await FormField.findByPk(id);
      if (!field) {
        return response.notFound(res, '字段不存在');
      }

      // 如果修改字段标识，检查是否重复
      if (field_key && field_key !== field.field_key) {
        const existField = await FormField.findOne({
          where: { group_id: field.group_id, field_key }
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
        default_value: default_value !== undefined ? default_value : field.default_value,
        placeholder: placeholder !== undefined ? placeholder : field.placeholder,
        is_required: is_required !== undefined ? is_required : field.is_required,
        sort_order: sort_order !== undefined ? sort_order : field.sort_order,
        status: status !== undefined ? status : field.status
      });

      console.log(`[更新字段成功] ID=${id}, 新options=`, field.options);

      return response.success(res, field, '更新成功');
    } catch (error) {
      console.error('更新字段错误:', error);
      return response.serverError(res, '更新字段失败');
    }
  },

  /**
   * 删除字段
   */
  deleteField: async (req, res) => {
    try {
      const { id } = req.params;

      const field = await FormField.findByPk(id);
      if (!field) {
        return response.notFound(res, '字段不存在');
      }

      await field.destroy();

      return response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除字段错误:', error);
      return response.serverError(res, '删除字段失败');
    }
  },

  /**
   * 批量更新排序
   */
  updateSort: async (req, res) => {
    try {
      const { items } = req.body; // [{ id, sort_order }, ...]

      if (!Array.isArray(items)) {
        return response.error(res, '参数格式错误');
      }

      const transaction = await sequelize.transaction();

      try {
        for (const item of items) {
          await FormField.update(
            { sort_order: item.sort_order },
            { where: { id: item.id }, transaction }
          );
        }
        await transaction.commit();
        return response.success(res, null, '排序更新成功');
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (error) {
      console.error('更新排序错误:', error);
      return response.serverError(res, '更新排序失败');
    }
  },

  // ==================== 功能开关管理 ====================

  /**
   * 获取功能开关配置
   */
  getFeatures: async (req, res) => {
    try {
      const features = await FormFeature.findAll();

      // 转换为 key-value 格式
      const result = {};
      features.forEach(f => {
        result[f.feature_key] = f.is_enabled;
      });

      return response.success(res, result);
    } catch (error) {
      console.error('获取功能开关错误:', error);
      return response.serverError(res, '获取功能开关失败');
    }
  },

  /**
   * 保存功能开关配置
   */
  saveFeatures: async (req, res) => {
    try {
      const features = req.body;

      // 定义已知的功能开关
      const knownFeatures = {
        locationParse: '定位解析'
      };

      for (const [key, value] of Object.entries(features)) {
        if (knownFeatures[key] !== undefined) {
          // 使用 upsert 插入或更新
          await FormFeature.upsert({
            feature_key: key,
            feature_name: knownFeatures[key],
            is_enabled: value ? 1 : 0
          });
        }
      }

      return response.success(res, null, '保存成功');
    } catch (error) {
      console.error('保存功能开关错误:', error);
      return response.serverError(res, '保存功能开关失败');
    }
  }
};

module.exports = formController;
