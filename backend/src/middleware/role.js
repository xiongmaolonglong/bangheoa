/**
 * 角色检查中间件
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 1,
        message: '未授权访问'
      })
    }

    const userRole = req.user.role
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        code: 1,
        message: '权限不足'
      })
    }

    next()
  }
}

module.exports = roleMiddleware