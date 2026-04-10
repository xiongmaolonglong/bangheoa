const express = require('express')
const router = express.Router()
const dispatchRuleController = require('../controllers/dispatchRule.controller')
const { authMiddleware } = require('../middleware/auth')

// 角色检查中间件
const checkRole = (req, res, next) => {
  const allowedRoles = ['admin', 'reviewer']
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ code: 1, message: '权限不足' })
  }
  next()
}

// 所有路由需要认证
router.use(authMiddleware)
router.use(checkRole)

router.get('/', dispatchRuleController.getList)
router.post('/', dispatchRuleController.create)
router.put('/:id', dispatchRuleController.update)
router.delete('/:id', dispatchRuleController.delete)
router.post('/:id/toggle', dispatchRuleController.toggle)

module.exports = router
