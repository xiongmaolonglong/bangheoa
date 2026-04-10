const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有用户路由需要认证
router.use(authenticate);

// 更新当前用户信息（业务员信息）
router.put('/profile', userController.updateProfile);

// 获取用户列表 - 管理员、审核主管可访问
router.get('/',
  authorize(['admin', 'reviewer']),
  userController.getList
);

// 获取可选处理人列表（派单用）
router.get('/handlers',
  authorize(['admin', 'reviewer']),
  userController.getHandlers
);

// 获取用户详情
router.get('/:id',
  authorize(['admin', 'reviewer']),
  userController.getDetail
);

// 创建用户 - 仅管理员
router.post('/',
  authorize(['admin']),
  userController.create
);

// 更新用户 - 仅管理员
router.put('/:id',
  authorize(['admin']),
  userController.update
);

// 删除用户 - 仅管理员
router.delete('/:id',
  authorize(['admin']),
  userController.delete
);

// 更新用户状态 - 仅管理员
router.put('/:id/status',
  authorize(['admin']),
  userController.updateStatus
);

// 重置密码 - 仅管理员
router.post('/:id/reset-password',
  authorize(['admin']),
  userController.resetPassword
);

module.exports = router;
