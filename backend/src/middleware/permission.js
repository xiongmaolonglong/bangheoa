const response = require('../utils/response');
const { USER_ROLES } = require('../config/constants');

// 导出新的 RBAC 中间件
const rbac = require('./rbac');

/**
 * 权限检查中间件（兼容旧版）
 * @param {String[]} allowedRoles - 允许的角色列表
 */
const checkPermission = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res, '请先登录');
    }

    const userRole = req.user.role;

    // 管理员拥有所有权限
    if (userRole === USER_ROLES.ADMIN) {
      return next();
    }

    // 检查角色是否在允许列表中
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return response.forbidden(res, '您没有权限执行此操作');
  };
};

/**
 * 检查是否为管理员
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
    return response.forbidden(res, '需要管理员权限');
  }
  next();
};

module.exports = {
  // 旧版兼容
  checkPermission,
  authorize: checkPermission,
  isAdmin,

  // 新版 RBAC
  rbac,
  checkResourcePermission: rbac.checkPermission,
  requireRoles: rbac.requireRoles,
  requireAnyPermission: rbac.requireAnyPermission,
  filterByDataScope: rbac.filterDataScope
};
