const jwtUtil = require('../utils/jwt');
const response = require('../utils/response');

/**
 * 认证中间件
 */
const authMiddleware = (req, res, next) => {
  const token = jwtUtil.getTokenFromHeader(req);

  if (!token) {
    return response.unauthorized(res, '请先登录');
  }

  const decoded = jwtUtil.verifyToken(token);

  if (!decoded) {
    return response.unauthorized(res, 'Token 已过期或无效');
  }

  // 将用户信息挂载到请求对象
  req.user = decoded;
  next();
};

/**
 * 可选认证中间件（不强制登录）
 */
const optionalAuth = (req, res, next) => {
  const token = jwtUtil.getTokenFromHeader(req);

  if (token) {
    const decoded = jwtUtil.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  authenticate: authMiddleware, // 别名
  optionalAuth
};
