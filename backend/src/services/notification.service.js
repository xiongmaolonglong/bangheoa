/**
 * 消息通知服务
 * 支持数据库存储 + WebSocket 实时推送
 */

const { Notification, User, Order } = require('../models');
const { Op } = require('sequelize');

// WebSocket 连接管理
const userConnections = new Map();

/**
 * 初始化 WebSocket
 */
function initWebSocket(httpServer) {
  const { Server } = require('socket.io');

  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('WebSocket 连接:', socket.id);

    // 用户登录绑定
    socket.on('authenticate', (userId) => {
      socket.userId = userId;
      userConnections.set(userId, socket);
      console.log(`用户 ${userId} 已连接`);

      // 加入用户房间
      socket.join(`user:${userId}`);

      // 发送未读通知数量
      getUnreadCount(userId).then(count => {
        socket.emit('unread_count', count);
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      if (socket.userId) {
        userConnections.delete(socket.userId);
        console.log(`用户 ${socket.userId} 已断开`);
      }
    });
  });

  global.io = io;
  return io;
}

/**
 * 创建通知
 */
async function createNotification(userId, { type, title, content, orderId, data }) {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    content,
    order_id: orderId,
    data: data ? JSON.stringify(data) : null,
    is_read: false,
    created_at: new Date()
  });

  // 实时推送
  pushToUser(userId, {
    id: notification.id,
    type,
    title,
    content,
    order_id: orderId,
    created_at: notification.created_at
  });

  return notification;
}

/**
 * 批量创建通知
 */
async function createBatchNotifications(userIds, notificationData) {
  const notifications = [];

  for (const userId of userIds) {
    const notification = await createNotification(userId, notificationData);
    notifications.push(notification);
  }

  return notifications;
}

/**
 * 推送消息给用户
 */
function pushToUser(userId, message) {
  if (global.io) {
    global.io.to(`user:${userId}`).emit('notification', message);
  }
}

/**
 * 推送给角色
 */
function pushToRole(role, message) {
  if (global.io) {
    global.io.to(`role:${role}`).emit('notification', message);
  }
}

/**
 * 获取用户通知列表
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
  const where = { user_id: userId };

  if (unreadOnly) {
    where.is_read = false;
  }

  const { count, rows } = await Notification.findAndCountAll({
    where,
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'order_no', 'title']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  return {
    list: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  };
}

/**
 * 获取未读数量
 */
async function getUnreadCount(userId) {
  return await Notification.count({
    where: {
      user_id: userId,
      is_read: false
    }
  });
}

/**
 * 标记已读
 */
async function markAsRead(userId, notificationIds) {
  const where = { user_id: userId };

  if (notificationIds && notificationIds.length > 0) {
    where.id = { [Op.in]: notificationIds };
  }

  return await Notification.update(
    { is_read: true, read_at: new Date() },
    { where }
  );
}

/**
 * 全部已读
 */
async function markAllAsRead(userId) {
  return await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } }
  );
}

/**
 * 删除通知
 */
async function deleteNotification(userId, notificationId) {
  return await Notification.destroy({
    where: { id: notificationId, user_id: userId }
  });
}

/**
 * 订单状态变更通知
 */
async function notifyStatusChange(order, newStatus, operator) {
  // 状态消息映射
  const statusMessages = {
    pending_review: '待审核',
    designing: '已派单设计',
    design_review: '设计完成待审核',
    producing: '已派单生产',
    checking: '生产完成待核对',
    installing: '已派单安装',
    install_review: '安装完成待审核',
    archived: '已归档',
    rejected: '已驳回'
  };

  const message = statusMessages[newStatus] || newStatus;

  // 确定通知对象
  const recipients = [];

  // 根据状态确定通知对象
  switch (newStatus) {
    case 'pending_review':
    case 'design_review':
    case 'install_review':
      // 审核状态通知审核员和管理员
      const reviewers = await User.findAll({
        where: { role: { [Op.in]: ['admin', 'reviewer'] }, status: 'active' },
        attributes: ['id']
      });
      recipients.push(...reviewers.map(u => u.id));
      break;

    case 'designing':
      // 设计任务通知设计师
      if (order.designer_id) {
        recipients.push(order.designer_id);
      }
      break;

    case 'installing':
      // 安装任务通知安装员
      if (order.installer_id) {
        recipients.push(order.installer_id);
      }
      break;

    case 'archived':
      // 归档通知客户和管理员
      if (order.customer_id) {
        recipients.push(order.customer_id);
      }
      const admins = await User.findAll({
        where: { role: 'admin', status: 'active' },
        attributes: ['id']
      });
      recipients.push(...admins.map(u => u.id));
      break;
  }

  // 去重
  const uniqueRecipients = [...new Set(recipients)].filter(id => id !== operator);

  // 批量创建通知
  for (const userId of uniqueRecipients) {
    await createNotification(userId, {
      type: 'status_change',
      title: '订单状态更新',
      content: `订单 ${order.order_no} ${message}`,
      orderId: order.id,
      data: {
        order_no: order.order_no,
        old_status: order.status,
        new_status: newStatus
      }
    });
  }
}

/**
 * 任务分配通知
 */
async function notifyTaskAssignment(order, assigneeId, assignerName) {
  await createNotification(assigneeId, {
    type: 'task_assigned',
    title: '新任务分配',
    content: `${assignerName} 将订单 ${order.order_no} 分配给您`,
    orderId: order.id,
    data: {
      order_no: order.order_no,
      task_type: order.status
    }
  });
}

/**
 * 系统公告
 */
async function broadcastAnnouncement(title, content, roles = null) {
  let where = { status: 'active' };
  if (roles) {
    where.role = { [Op.in]: roles };
  }

  const users = await User.findAll({
    where,
    attributes: ['id']
  });

  for (const user of users) {
    await createNotification(user.id, {
      type: 'announcement',
      title,
      content,
      data: { is_broadcast: true }
    });
  }
}

module.exports = {
  initWebSocket,
  createNotification,
  createBatchNotifications,
  pushToUser,
  pushToRole,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyStatusChange,
  notifyTaskAssignment,
  broadcastAnnouncement
};