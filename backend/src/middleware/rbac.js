const response = require('../utils/response');

/**
 * RBAC 权限中间件
 * 支持资源级和操作级权限控制
 */

// 权限配置表
const PERMISSIONS = {
  admin: {
    order: ['create', 'read', 'update', 'delete', 'update_status', 'assign', 'export'],
    user: ['create', 'read', 'update', 'delete'],
    region: ['create', 'read', 'update', 'delete'],
    design: ['create', 'read', 'update', 'delete', 'approve'],
    measure: ['create', 'read', 'update', 'delete', 'approve'],
    production: ['create', 'read', 'update', 'delete'],
    install: ['create', 'read', 'update', 'delete', 'approve'],
    archive: ['create', 'read', 'update', 'delete'],
    statistics: ['read', 'export'],
    settings: ['read', 'update']
  },
  reviewer: {
    order: ['read', 'update_status', 'assign'],
    design: ['read', 'approve'],
    measure: ['read', 'approve'],
    install: ['read', 'approve'],
    statistics: ['read']
  },
  designer: {
    order: ['read'],
    design: ['create', 'read', 'update']
  },
  producer: {
    order: ['read'],
    production: ['create', 'read', 'update']
  },
  checker: {
    order: ['read'],
    production: ['read', 'update']
  },
  installer: {
    order: ['read'],
    install: ['create', 'read', 'update']
  }
};

// 资源所有权检查配置
const OWNERSHIP_CHECK = {
  order: {
    model: 'Order',
    ownerField: 'assignee_id'
  },
  design: {
    model: 'DesignScheme',
    ownerField: 'designer_id'
  },
  install: {
    model: 'InstallReport',
    ownerField: 'installer_id'
  }
};

/**
 * 检查用户是否有指定资源和操作的权限
 * @param {string} resource - 资源名称
 * @param {string} action - 操作名称
 * @param {object} options - 配置选项
 * @param {boolean} options.checkOwnership - 是否检查所有权
 * @param {string} options.scope - 权限范围 (all/own/department)
 */
const checkPermission = (resource, action, options = {}) => {
  return async (req, res, next) => {
    const { role, id: userId, department_id: userDeptId } = req.user || {};

    // 未登录
    if (!role) {
      return response.unauthorized(res, '请先登录');
    }

    // 管理员全权限
    if (role === 'admin') {
      return next();
    }

    // 检查角色权限
    const rolePermissions = PERMISSIONS[role];
    if (!rolePermissions) {
      return response.forbidden(res, '角色未配置权限');
    }

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions || !resourcePermissions.includes(action)) {
      return response.forbidden(res, `无权执行此操作: ${resource}.${action}`);
    }

    // 检查资源所有权
    if (options.checkOwnership) {
      const ownershipConfig = OWNERSHIP_CHECK[resource];
      if (ownershipConfig) {
        const model = require(`../models/${ownershipConfig.model.toLowerCase()}`);
        const resource_id = req.params.id;

        if (resource_id) {
          const record = await model.findByPk(resource_id);
          if (!record) {
            return response.notFound(res, '资源不存在');
          }

          // 检查所有权
          if (record[ownershipConfig.ownerField] !== userId) {
            return response.forbidden(res, '只能操作自己的资源');
          }
        }
      }
    }

    // 部门级权限检查
    if (options.scope === 'department' && userDeptId) {
      const resource_dept_id = req.body.department_id || req.query.department_id;
      if (resource_dept_id && resource_dept_id !== userDeptId) {
        return response.forbidden(res, '只能操作本部门资源');
      }
    }

    next();
  };
};

/**
 * 角色检查中间件
 * @param {string[]} roles - 允许的角色列表
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    const { role } = req.user || {};

    if (!role) {
      return response.unauthorized(res, '请先登录');
    }

    if (!roles.includes(role) && role !== 'admin') {
      return response.forbidden(res, '权限不足');
    }

    next();
  };
};

/**
 * 组合权限检查
 * @param {Array<{resource: string, action: string}>} permissions - 权限列表
 */
const requireAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    const { role } = req.user || {};

    if (role === 'admin') {
      return next();
    }

    const rolePermissions = PERMISSIONS[role] || {};

    const hasAnyPermission = permissions.some(
      ({ resource, action }) => {
        const resourcePerms = rolePermissions[resource] || [];
        return resourcePerms.includes(action);
      }
    );

    if (!hasAnyPermission) {
      return response.forbidden(res, '权限不足');
    }

    next();
  };
};

/**
 * 数据权限过滤
 * 根据用户角色过滤查询条件
 */
const filterByDataScope = (req, res, next) => {
  const { role, id: userId, department_id: deptId } = req.user || {};

  // 管理员不过滤
  if (role === 'admin') {
    return next();
  }

  // 获取查询条件对象
  const where = req.query.where || {};

  // 根据角色添加过滤条件
  switch (role) {
    case 'designer':
      where.designer_id = userId;
      break;
    case 'installer':
      where.installer_id = userId;
      break;
    case 'reviewer':
      // 审核员可以看到所有待审核的订单
      break;
    default:
      // 其他角色只能看到自己相关的订单
      where[Op.or] = [
        { customer_id: userId },
        { assignee_id: userId }
      ];
  }

  req.query.where = where;
  next();
};

module.exports = {
  checkPermission,
  requireRoles,
  requireAnyPermission,
  filterByDataScope,
  PERMISSIONS
};