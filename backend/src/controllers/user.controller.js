const logger = require('../utils/logger');
const response = require('../utils/response');
const { User, Department, Group } = require('../models');
const { Op } = require('sequelize');

/**
 * 用户管理控制器
 */
const userController = {
  /**
   * 获取用户列表
   */
  getList: async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword,
        role,
        status
      } = req.query;

      const where = {};

      // 关键词搜索
      if (keyword) {
        where[Op.or] = [
          { username: { [Op.like]: `%${keyword}%` } },
          { real_name: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ];
      }

      // 角色筛选
      if (role) {
        where.role = role;
      }

      // 状态筛选
      if (status !== undefined && status !== '' && status !== null) {
        const statusNum = parseInt(status);
        if (!isNaN(statusNum)) {
          where.status = statusNum;
        }
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name'],
            required: false
          }
        ],
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
      logger.error('获取用户列表错误:', error);
      return response.serverError(res, '获取用户列表失败');
    }
  },

  /**
   * 获取用户详情
   */
  getDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      });

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      return response.success(res, user);
    } catch (error) {
      logger.error('获取用户详情错误:', error);
      return response.serverError(res, '获取用户详情失败');
    }
  },

  /**
   * 创建用户
   */
  create: async (req, res) => {
    try {
      const {
        username,
        password,
        real_name,
        phone,
        role,
        department_id,
        group_id,
        status
      } = req.body;

      // 验证必填字段
      if (!username || !real_name) {
        return response.error(res, '用户名和真实姓名不能为空');
      }

      // 检查用户名是否已存在
      const existUser = await User.findOne({ where: { username } });
      if (existUser) {
        return response.error(res, '用户名已存在');
      }

      // 生成默认密码
      const defaultPassword = password || '123456';

      // 创建用户
      const user = await User.create({
        username,
        password: defaultPassword,
        real_name,
        phone,
        role: role || 'designer',
        department_id,
        group_id,
        status: status !== undefined ? status : 1
      });

      return response.success(res, user.toSafeJSON(), '创建成功');
    } catch (error) {
      logger.error('创建用户错误:', error);
      return response.serverError(res, '创建用户失败');
    }
  },

  /**
   * 更新用户
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        real_name,
        phone,
        role,
        department_id,
        group_id,
        status
      } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      // 更新用户信息
      await user.update({
        real_name: real_name || user.real_name,
        phone: phone !== undefined ? phone : user.phone,
        role: role || user.role,
        department_id: department_id !== undefined ? department_id : user.department_id,
        group_id: group_id !== undefined ? group_id : user.group_id,
        status: status !== undefined ? status : user.status
      });

      return response.success(res, user.toSafeJSON(), '更新成功');
    } catch (error) {
      logger.error('更新用户错误:', error);
      return response.serverError(res, '更新用户失败');
    }
  },

  /**
   * 删除用户
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // 不能删除自己
      if (req.user && req.user.id === parseInt(id)) {
        return response.error(res, '不能删除当前登录用户');
      }

      const user = await User.findByPk(id);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      await user.destroy();

      return response.success(res, null, '删除成功');
    } catch (error) {
      logger.error('删除用户错误:', error);
      return response.serverError(res, '删除用户失败');
    }
  },

  /**
   * 更新用户状态
   */
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // 不能禁用自己
      if (req.user && req.user.id === parseInt(id) && status === 0) {
        return response.error(res, '不能禁用当前登录用户');
      }

      const user = await User.findByPk(id);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      await user.update({ status });

      return response.success(res, null, '状态更新成功');
    } catch (error) {
      logger.error('更新用户状态错误:', error);
      return response.serverError(res, '更新用户状态失败');
    }
  },

  /**
   * 重置密码
   */
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      // 重置为默认密码或指定密码
      const newPassword = password || '123456';
      await user.update({ password: newPassword });

      return response.success(res, null, '密码重置成功');
    } catch (error) {
      logger.error('重置密码错误:', error);
      return response.serverError(res, '重置密码失败');
    }
  },

  /**
   * 获取可选的处理人列表（用于派单）
   */
  getHandlers: async (req, res) => {
    try {
      const { role } = req.query;

      const where = { status: 1 };

      if (role) {
        // 支持多个角色，逗号分隔
        const roles = role.split(',').map(r => r.trim());
        where.role = roles.length === 1 ? roles[0] : { [Op.in]: roles };
      }

      const users = await User.findAll({
        where,
        attributes: ['id', 'username', 'real_name', 'phone', 'role'],
        order: [['real_name', 'ASC']]
      });

      return response.success(res, users);
    } catch (error) {
      logger.error('获取处理人列表错误:', error);
      return response.serverError(res, '获取处理人列表失败');
    }
  },

  /**
   * 更新当前用户信息（小程序用户更新业务员信息）
   */
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { salesman_name, salesman_phone } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        return response.notFound(res, '用户不存在');
      }

      // 只更新业务员相关字段
      const updateData = {};
      if (salesman_name !== undefined) {
        updateData.salesman_name = salesman_name;
      }
      if (salesman_phone !== undefined) {
        updateData.salesman_phone = salesman_phone;
      }

      await user.update(updateData);

      return response.success(res, user.toSafeJSON(), '更新成功');
    } catch (error) {
      logger.error('更新用户信息错误:', error);
      return response.serverError(res, '更新用户信息失败');
    }
  }
};

module.exports = userController;
