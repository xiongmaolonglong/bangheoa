const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const TenantUser = require('../models/TenantUser');
const ClientUser = require('../models/ClientUser');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成 JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 从用户实例中排除敏感字段
 */
function sanitizeUser(user) {
  const u = user.toJSON();
  delete u.password_hash;
  delete u.createdAt;
  delete u.updatedAt;
  delete u.deletedAt;
  return u;
}

// ==================== 广告商员工登录 ====================

async function tenantLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return error(res, '手机号和密码不能为空', 400);
    }

    const user = await TenantUser.findOne({ where: { phone, status: 'active' } });
    if (!user) {
      return error(res, '手机号或密码错误', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return error(res, '手机号或密码错误', 401);
    }

    const token = signToken({
      user_id: user.id,
      user_type: 'tenant',
      tenant_id: user.tenant_id,
      role: user.role,
    });

    return success(res, { token, user: sanitizeUser(user) }, '登录成功');
  } catch (err) {
    console.error('Tenant login error:', err);
    return error(res, '登录失败，请稍后重试');
  }
}

// ==================== 甲方人员登录 ====================

async function clientLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return error(res, '手机号和密码不能为空', 400);
    }

    const user = await ClientUser.findOne({ where: { phone, status: 'active' } });
    if (!user) {
      return error(res, '手机号或密码错误', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return error(res, '手机号或密码错误', 401);
    }

    const token = signToken({
      user_id: user.id,
      user_type: 'client',
      client_id: user.client_id,
      role: user.role,
    });

    return success(res, { token, user: sanitizeUser(user) }, '登录成功');
  } catch (err) {
    console.error('Client login error:', err);
    return error(res, '登录失败，请稍后重试');
  }
}

// ==================== 超级管理员登录 ====================

async function superAdminLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return error(res, '手机号和密码不能为空', 400);
    }

    // 超级管理员：从 TenantUser 中查找 role='admin' 的用户
    const user = await TenantUser.findOne({ where: { phone, status: 'active' } });
    if (!user) {
      return error(res, '手机号或密码错误', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return error(res, '手机号或密码错误', 401);
    }

    // 超级管理员 token 使用 super_admin 角色
    const token = signToken({
      user_id: user.id,
      user_type: 'tenant',
      tenant_id: user.tenant_id,
      role: 'super_admin',
    });

    return success(res, { token, user: sanitizeUser(user) }, '登录成功');
  } catch (err) {
    console.error('Super admin login error:', err);
    return error(res, '登录失败，请稍后重试');
  }
}

// ==================== 修改密码 ====================

async function changePassword(req, res) {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return error(res, '旧密码和新密码不能为空', 400);
    }

    if (new_password.length < 6) {
      return error(res, '新密码至少 6 位', 400);
    }

    const { user_id, user_type } = req.user;
    const Model = user_type === 'tenant' ? TenantUser : ClientUser;

    const user = await Model.findByPk(user_id);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    const valid = await bcrypt.compare(old_password, user.password_hash);
    if (!valid) {
      return error(res, '旧密码错误', 400);
    }

    user.password_hash = new_password; // beforeUpdate hook will hash it
    await user.save();

    return success(res, null, '密码修改成功');
  } catch (err) {
    console.error('Change password error:', err);
    return error(res, '修改密码失败，请稍后重试');
  }
}

// ==================== 忘记密码（通过手机号重置） ====================

async function forgotPassword(req, res) {
  try {
    const { phone, new_password } = req.body;

    if (!phone || !new_password) {
      return error(res, '手机号和新密码不能为空', 400);
    }

    if (new_password.length < 6) {
      return error(res, '新密码至少 6 位', 400);
    }

    const user = await TenantUser.findOne({ where: { phone, status: 'active' } });
    if (!user) {
      return error(res, '该手机号未注册', 404);
    }

    user.password_hash = new_password; // beforeUpdate hook will hash it
    await user.save();

    return success(res, null, '密码重置成功，请使用新密码登录');
  } catch (err) {
    console.error('Forgot password error:', err);
    return error(res, '重置密码失败，请稍后重试');
  }
}

// ==================== 获取当前用户信息 ====================

async function getCurrentUser(req, res) {
  try {
    const { user_id, user_type } = req.user;
    const Model = user_type === 'tenant' ? TenantUser : ClientUser;

    const user = await Model.findByPk(user_id);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    return success(res, sanitizeUser(user));
  } catch (err) {
    console.error('Get current user error:', err);
    return error(res, '获取用户信息失败');
  }
}

module.exports = { tenantLogin, clientLogin, superAdminLogin, changePassword, forgotPassword, getCurrentUser };
