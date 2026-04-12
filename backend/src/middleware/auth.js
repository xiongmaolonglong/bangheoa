const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
  } catch {
    return null;
  }
}

/**
 * JWT 认证中间件
 * 要求任一类型用户登录即可
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  req.user = {
    user_id: payload.user_id,
    user_type: payload.user_type,   // 'tenant' | 'client'
    tenant_id: payload.tenant_id,
    client_id: payload.client_id,
    role: payload.role,
  };

  next();
}

/**
 * 仅 tenant（广告商员工）可访问
 */
function requireTenant(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  if (payload.user_type !== 'tenant') {
    return res.status(403).json({ error: '无权访问此资源' });
  }

  req.user = {
    user_id: payload.user_id,
    user_type: 'tenant',
    tenant_id: payload.tenant_id,
    role: payload.role,
  };

  next();
}

/**
 * 仅 client（甲方人员）可访问
 */
function requireClient(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  if (payload.user_type !== 'client') {
    return res.status(403).json({ error: '无权访问此资源' });
  }

  req.user = {
    user_id: payload.user_id,
    user_type: 'client',
    client_id: payload.client_id,
    role: payload.role,
  };

  next();
}

/**
 * 超级管理员权限
 * 要求 user_type='tenant' 且 role='admin'，或专门的 'super_admin' 角色
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }

  const isAdmin = payload.role === 'super_admin'
    || (payload.user_type === 'tenant' && payload.role === 'admin');

  if (!isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  req.user = {
    user_id: payload.user_id,
    user_type: payload.user_type,
    tenant_id: payload.tenant_id,
    role: payload.role,
  };

  next();
}

module.exports = { requireAuth, requireTenant, requireClient, requireAdmin };
