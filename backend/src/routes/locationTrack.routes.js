const express = require('express');
const router = express.Router();
const locationTrackController = require('../controllers/locationTrack.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有路由需要认证
router.use(authenticate);

// 上报定位（安装员/测量员等外勤人员）
router.post('/report', locationTrackController.reportLocation);

// 批量上报
router.post('/batch-report', locationTrackController.batchReportLocation);

// 获取所有在线追踪人员（管理员/审核主管）
router.get('/trackers',
  authorize(['admin', 'reviewer']),
  locationTrackController.getTrackers
);

// 获取某人轨迹详情
router.get('/track/:userId', locationTrackController.getUserTrack);

module.exports = router;
