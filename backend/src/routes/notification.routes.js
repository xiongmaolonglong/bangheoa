/**
 * 通知路由
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middleware/auth');

// 获取通知列表
router.get('/',
  authMiddleware,
  notificationController.list
);

// 获取未读数量
router.get('/unread-count',
  authMiddleware,
  notificationController.unreadCount
);

// 标记已读
router.post('/read',
  authMiddleware,
  notificationController.markRead
);

// 全部已读
router.post('/read-all',
  authMiddleware,
  notificationController.markAllRead
);

// 删除通知
router.delete('/:id',
  authMiddleware,
  notificationController.delete
);

module.exports = router;