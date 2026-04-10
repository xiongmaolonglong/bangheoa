const response = require('../utils/response');
const { Face } = require('../models');

/**
 * 面配置控制器
 */
const faceController = {
  /**
   * 获取面列表
   */
  getList: async (req, res) => {
    try {
      const list = await Face.findAll({
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });
      return response.success(res, list);
    } catch (error) {
      console.error('获取面列表错误:', error);
      return response.serverError(res, '获取面列表失败');
    }
  },

  /**
   * 获取单个面
   */
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const face = await Face.findByPk(id);
      if (!face) {
        return response.notFound(res, '面不存在');
      }
      return response.success(res, face);
    } catch (error) {
      console.error('获取面详情错误:', error);
      return response.serverError(res, '获取面详情失败');
    }
  },

  /**
   * 创建面
   */
  create: async (req, res) => {
    try {
      const { name, code, sort_order, status } = req.body;

      if (!name) {
        return response.error(res, '面名称不能为空');
      }

      // 获取最大排序值
      let sortOrder = sort_order;
      if (sortOrder === undefined) {
        const maxOrder = await Face.max('sort_order') || 0;
        sortOrder = maxOrder + 1;
      }

      const face = await Face.create({
        name,
        code: code || name.toLowerCase(),
        sort_order: sortOrder,
        status: status !== undefined ? status : 1
      });

      return response.success(res, face, '创建成功');
    } catch (error) {
      console.error('创建面错误:', error);
      return response.serverError(res, '创建面失败');
    }
  },

  /**
   * 更新面
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, sort_order, status } = req.body;

      const face = await Face.findByPk(id);
      if (!face) {
        return response.notFound(res, '面不存在');
      }

      await face.update({
        name: name || face.name,
        code: code !== undefined ? code : face.code,
        sort_order: sort_order !== undefined ? sort_order : face.sort_order,
        status: status !== undefined ? status : face.status
      });

      return response.success(res, face, '更新成功');
    } catch (error) {
      console.error('更新面错误:', error);
      return response.serverError(res, '更新面失败');
    }
  },

  /**
   * 删除面
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const face = await Face.findByPk(id);
      if (!face) {
        return response.notFound(res, '面不存在');
      }

      await face.destroy();
      return response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除面错误:', error);
      return response.serverError(res, '删除面失败');
    }
  }
};

module.exports = faceController;
