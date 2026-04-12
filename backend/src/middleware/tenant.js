/**
 * 多租户隔离中间件
 * 自动注入 tenant_id 过滤，防止跨租户数据访问
 */
function injectTenant(req, res, next) {
  // 仅对有 user_type 的请求生效
  if (!req.user || req.user.user_type !== 'tenant') {
    return next();
  }

  req.tenantId = req.user.tenant_id;

  // 超级管理员跳过 tenant 过滤
  if (req.user.role === 'super_admin') {
    return next();
  }

  // 记录 tenant_id 供后续使用
  req.locals = req.locals || {};
  req.locals.tenant_id = req.tenantId;

  next();
}

/**
 * 为 Sequelize 查询自动注入 tenant 过滤条件
 * 用法：在 controller 中调用 buildTenantFilter(Model, whereClause)
 */
function buildTenantFilter(Model, where = {}) {
  return function tenantFilter(req, _res, _next) {
    if (req.user?.role === 'super_admin') {
      return; // 超管不过滤
    }
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (tenantId && Model.rawAttributes?.tenant_id) {
      where.tenant_id = tenantId;
    }
  };
}

module.exports = { injectTenant, buildTenantFilter };
