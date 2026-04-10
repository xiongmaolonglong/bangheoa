/**
 * 通知控制器
 */

const notificationService = require('../services/notification.service');
const response = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 获取通知列表
 */
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, unread_only } = req.query;
  const result = await notificationService.getUserNotifications(req.user.id, {
    page,
    limit,
    unreadOnly: unread_only === 'true'
  });
  response.success(res, result);
});

/**
 * 获取未读数量
 */
exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  response.success(res, { count });
});

/**
 * 标记已读
 */
exports.markRead = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  await notificationService.markAsRead(req.user.id, ids);
  response.success(res, null, '已标记为已读');
});

/**
 * 全部已读
 */
exports.markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  response.success(res, null, '已全部标记为已读');
});

/**
 * 删除通知
 */
exports.delete = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user.id, req.params.id);
  response.success(res, null, '删除成功');
});