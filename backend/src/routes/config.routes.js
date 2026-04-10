const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/v1/config/constants
 * @desc 获取所有系统常量配置
 * @access Public
 */
router.get('/constants', configController.getConstants);

/**
 * @route GET /api/v1/config/order-status
 * @desc 获取订单状态配置
 * @access Public
 */
router.get('/order-status', configController.getOrderStatusConfig);

/**
 * @route GET /api/v1/config/user-roles
 * @desc 获取用户角色配置
 * @access Public
 */
router.get('/user-roles', configController.getUserRolesConfig);

/**
 * @route GET /api/v1/config/materials
 * @desc 获取默认材质列表
 * @access Public
 */
router.get('/materials', configController.getDefaultMaterials);

/**
 * @route PUT /api/v1/config/materials
 * @desc 更新默认材质列表
 * @access Private (admin)
 */
router.put('/materials', authMiddleware, configController.updateDefaultMaterials);

/**
 * @route GET /api/v1/config/all
 * @desc 获取所有系统配置
 * @access Private (admin)
 */
router.get('/all', authMiddleware, configController.getAllConfigs);

/**
 * @route GET /api/v1/config/:key
 * @desc 获取指定配置项
 * @access Public
 */
router.get('/:key', configController.getSystemConfig);

/**
 * @route PUT /api/v1/config/:key
 * @desc 更新指定配置项
 * @access Private (admin)
 */
router.put('/:key', authMiddleware, configController.updateSystemConfig);

module.exports = router;
