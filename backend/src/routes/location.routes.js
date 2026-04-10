const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { authMiddleware } = require('../middleware/auth');

/**
 * 定位相关路由
 */

// 地理编码 - 根据地址获取经纬度
router.get('/geocode', locationController.geocode);

// 逆地理编码 - 根据经纬度获取详细地址
router.get('/reverse', locationController.reverseGeocode);

// 批量地理编码 - 为所有没有坐标的订单解析地址（需登录）
router.post('/batch-geocode', authMiddleware, locationController.batchGeocode);

module.exports = router;
