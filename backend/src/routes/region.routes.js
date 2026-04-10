const express = require('express')
const router = express.Router()
const regionController = require('../controllers/region.controller')
const { authMiddleware } = require('../middleware/auth')
const { cacheMiddleware, clearCache } = require('../services/cache.service')

// 省份 - 缓存 1 小时
router.get('/provinces',
  authMiddleware,
  cacheMiddleware('regions:provinces', 3600),
  regionController.getProvinces
)
router.post('/provinces', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.createProvince)
router.put('/provinces/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.updateProvince)
router.delete('/provinces/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.deleteProvince)

// 分区 - 缓存 1 小时
router.get('/provinces/:provinceId/districts',
  authMiddleware,
  cacheMiddleware('regions:districts', 3600),
  regionController.getDistricts
)
router.post('/districts', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.createDistrict)
router.put('/districts/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.updateDistrict)
router.delete('/districts/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.deleteDistrict)

// 小组 - 缓存 1 小时
router.get('/districts/:districtId/groups',
  authMiddleware,
  cacheMiddleware('regions:groups', 3600),
  regionController.getGroups
)
router.post('/groups', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.createGroup)
router.put('/groups/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.updateGroup)
router.delete('/groups/:id', authMiddleware, (req, res, next) => {
  clearCache('regions:*');
  next();
}, regionController.deleteGroup)

// 地区树 - 缓存 1 小时
router.get('/tree',
  authMiddleware,
  cacheMiddleware('regions:tree', 3600),
  regionController.getRegionTree
)

module.exports = router
