const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有统计路由需要认证
router.use(authenticate);

// 仪表盘数据 - 所有登录用户可访问
router.get('/dashboard', statisticsController.getDashboard);

// 订单统计 - 管理员
router.get('/orders', authorize(['admin']), statisticsController.getOrderStats);

// 人员绩效 - 管理员
router.get('/performance', authorize(['admin']), statisticsController.getPerformance);

// 区域分布 - 管理员
router.get('/region', authorize(['admin']), statisticsController.getRegionStats);

// 收入分析 - 管理员
router.get('/revenue', authorize(['admin']), statisticsController.getRevenueStats);

// 效率指标 - 管理员
router.get('/efficiency', authorize(['admin']), statisticsController.getEfficiency);

// 预警提醒 - 所有登录用户
router.get('/alerts', statisticsController.getAlerts);

// 我的待办任务
router.get('/my-tasks', statisticsController.getMyTasks);

// 项目流水线
router.get('/pipeline', statisticsController.getPipeline);

// 团队活跃
router.get('/team-activity', statisticsController.getTeamActivity);

// 通知列表
router.get('/notifications', statisticsController.getNotifications);

// 标记单个通知已读
router.put('/notifications/:id/read', statisticsController.markNotificationRead);

// 标记全部通知已读
router.put('/notifications/read-all', statisticsController.markAllNotificationsRead);

module.exports = router;
