const express = require('express')
const router = express.Router()
const materialController = require('../controllers/material.controller')
const { authMiddleware: auth } = require('../middleware/auth')

// 材质列表
router.get('/', auth, materialController.getList)

// 材质详情
router.get('/:id', auth, materialController.getDetail)

// 创建材质
router.post('/', auth, materialController.create)

// 更新材质
router.put('/:id', auth, materialController.update)

// 删除材质
router.delete('/:id', auth, materialController.delete)

module.exports = router
