const express = require('express');
const router = express.Router();
const { requireTenant } = require('../middleware/auth');
const { injectTenant } = require('../middleware/tenant');
const clientController = require('../controllers/clientController');

// 所有甲方管理接口都需要 tenant 登录
router.use(requireTenant);
router.use(injectTenant);

// ==================== 甲方企业 ====================
router.get('/clients', clientController.listClients);
router.post('/clients', clientController.createClient);
router.get('/clients/:id', clientController.getClient);
router.put('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);

// ==================== 甲方部门 ====================
router.get('/clients/:clientId/departments', clientController.listDepartments);
router.post('/clients/:clientId/departments', clientController.createDepartment);
router.put('/clients/:clientId/departments/:id', clientController.updateDepartment);
router.delete('/clients/:clientId/departments/:id', clientController.deleteDepartment);

// ==================== 甲方人员 ====================
router.get('/clients/:clientId/users', clientController.listUsers);
router.post('/clients/:clientId/users', clientController.createUser);
router.put('/clients/:clientId/users/:id', clientController.updateUser);
router.delete('/clients/:clientId/users/:id', clientController.deleteUser);

// ==================== 甲方人员管辖区域 ====================
router.get('/clients/:clientId/users/:userId/regions', clientController.listRegions);
router.post('/clients/:clientId/users/:userId/regions', clientController.setRegions);
router.delete('/clients/:clientId/users/:userId/regions/:id', clientController.deleteRegion);

module.exports = router;
