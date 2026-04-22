const logger = require('../utils/logger');
const response = require('../utils/response');
const { Supplier } = require('../models');
const { Op } = require('sequelize');

/**
 * 供应商管理控制器
 */
const supplierController = {
  /**
   * 获取供应商列表
   */
  getList: async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword,
        status
      } = req.query;

      const where = {};

      // 关键词搜索
      if (keyword) {
        where[Op.or] = [
          { name: { [Op.like]: `%${keyword}%` } },
          { contact: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ];
      }

      // 状态筛选
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      const { count, rows } = await Supplier.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize)
      });

      return response.success(res, {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      logger.error('获取供应商列表错误:', error);
      return response.serverError(res, '获取供应商列表失败');
    }
  },

  /**
   * 获取所有启用的供应商（下拉选择用）
   */
  getAll: async (req, res) => {
    try {
      const suppliers = await Supplier.findAll({
        where: { status: 1 },
        attributes: ['id', 'name', 'contact', 'phone'],
        order: [['name', 'ASC']]
      });

      return response.success(res, suppliers);
    } catch (error) {
      logger.error('获取供应商列表错误:', error);
      return response.serverError(res, '获取供应商列表失败');
    }
  },

  /**
   * 获取供应商详情
   */
  getDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return response.notFound(res, '供应商不存在');
      }

      return response.success(res, supplier);
    } catch (error) {
      logger.error('获取供应商详情错误:', error);
      return response.serverError(res, '获取供应商详情失败');
    }
  },

  /**
   * 创建供应商
   */
  create: async (req, res) => {
    try {
      const {
        name,
        contact,
        phone,
        address,
        remark,
        status
      } = req.body;

      // 验证必填字段
      if (!name) {
        return response.error(res, '供应商名称不能为空');
      }

      // 检查名称是否已存在
      const existSupplier = await Supplier.findOne({ where: { name } });
      if (existSupplier) {
        return response.error(res, '供应商名称已存在');
      }

      // 创建供应商
      const supplier = await Supplier.create({
        name,
        contact,
        phone,
        address,
        remark,
        status: status !== undefined ? status : 1
      });

      return response.success(res, supplier, '创建成功');
    } catch (error) {
      logger.error('创建供应商错误:', error);
      return response.serverError(res, '创建供应商失败');
    }
  },

  /**
   * 更新供应商
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        contact,
        phone,
        address,
        remark,
        status
      } = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return response.notFound(res, '供应商不存在');
      }

      // 检查名称是否与其他供应商重复
      if (name && name !== supplier.name) {
        const existSupplier = await Supplier.findOne({ where: { name } });
        if (existSupplier) {
          return response.error(res, '供应商名称已存在');
        }
      }

      // 更新供应商信息
      await supplier.update({
        name: name || supplier.name,
        contact: contact !== undefined ? contact : supplier.contact,
        phone: phone !== undefined ? phone : supplier.phone,
        address: address !== undefined ? address : supplier.address,
        remark: remark !== undefined ? remark : supplier.remark,
        status: status !== undefined ? status : supplier.status
      });

      return response.success(res, supplier, '更新成功');
    } catch (error) {
      logger.error('更新供应商错误:', error);
      return response.serverError(res, '更新供应商失败');
    }
  },

  /**
   * 删除供应商
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return response.notFound(res, '供应商不存在');
      }

      await supplier.destroy();

      return response.success(res, null, '删除成功');
    } catch (error) {
      logger.error('删除供应商错误:', error);
      return response.serverError(res, '删除供应商失败');
    }
  },

  /**
   * 更新供应商状态
   */
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return response.notFound(res, '供应商不存在');
      }

      await supplier.update({ status });

      return response.success(res, null, '状态更新成功');
    } catch (error) {
      logger.error('更新供应商状态错误:', error);
      return response.serverError(res, '更新供应商状态失败');
    }
  }
};

module.exports = supplierController;
