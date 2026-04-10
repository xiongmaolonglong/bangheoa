const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customer.controller')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', customerController.getList)
router.get('/tags', customerController.getTags)
router.get('/:phone(\\d+)', customerController.getDetail)
router.put('/:phone', customerController.update)

module.exports = router
