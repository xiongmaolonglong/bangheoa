const express = require('express');
const router = express.Router();
const { requireTenant, requireAuth } = require('../middleware/auth');
const {
  listAssignments,
  createAssignment,
  getAssignment,
  receiveAssignment,
  listMeasurementTasks,
  getMeasurementTask,
  submitMeasurement,
  reviewMeasurement,
  getMeasurementHistory,
} = require('../controllers/assignmentController');

// ==================== 派单管理 ====================

// 待派单列表（广告商派单员/管理员）
router.get('/assignments', requireTenant, listAssignments);

// 创建派单
router.post('/assignments', requireTenant, createAssignment);

// 派单详情
router.get('/assignments/:id', requireTenant, getAssignment);

// 测量员确认接收派单
router.put('/assignments/:id/receive', requireAuth, receiveAssignment);

// ==================== 测量任务 ====================

// 测量员的任务列表
router.get('/measurements/tasks', requireAuth, listMeasurementTasks);

// 测量任务详情
router.get('/measurements/tasks/:workOrderId', requireAuth, getMeasurementTask);

// 提交测量数据
router.post('/measurements/:workOrderId', requireAuth, submitMeasurement);

// 审核测量结果
router.post('/measurements/:workOrderId/review', requireTenant, reviewMeasurement);

// 同地址历史工单
router.get('/measurements/:workOrderId/history', requireAuth, getMeasurementHistory);

module.exports = router;
