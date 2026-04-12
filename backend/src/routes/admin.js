const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/adminController');

// 所有超级管理路由都需要 admin 权限
router.use(requireAdmin);

// ========== 租户管理 ==========
router.get('/tenants', controller.listTenants);
router.post('/tenants', controller.createTenant);
router.get('/tenants/:id', controller.getTenant);
router.put('/tenants/:id', controller.updateTenant);
router.put('/tenants/:id/status', controller.updateTenantStatus);

// ========== 全局数据看板 ==========
router.get('/dashboard', controller.getDashboard);
router.get('/dashboard/trend', controller.getDashboardTrend);

// ========== 工单穿透查询 ==========
router.get('/work-orders', controller.listAllWorkOrders);
router.get('/work-orders/:id', controller.getWorkOrder);
router.get('/work-orders/:id/logs', controller.getWorkOrderLogs);

// ========== 甲方监管 ==========
router.get('/clients', controller.listAllClients);

// ========== 全局申报 ==========
router.get('/declarations', controller.listAllDeclarations);

// ========== 系统配置 ==========
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

module.exports = router;
