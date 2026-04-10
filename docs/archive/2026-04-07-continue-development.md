# 户外广告派单系统 - 继续开发实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成户外广告派单系统剩余功能的开发，实现完整的订单流程管理

**Architecture:** 基于现有的 Express 后端 + Vue3 前端架构，补充完善各业务模块的 API 和页面

**Tech Stack:** Node.js/Express, Sequelize, MySQL, Vue 3, Element Plus, Pinia, Axios

---

## 当前完成状态

### ✅ 已完成
- 后端框架搭建、数据库模型、用户认证 API
- 前端框架搭建、登录页面、Dashboard 页面、主布局组件

### ❌ 待完成
- 后端：订单 CRUD API、地区组织 API、广告类型 API、测量/设计/生产/核对/安装 API
- 前端：订单管理、审核中心、测量/设计/生产/核对/安装管理、系统设置等页面

---

## 任务清单

---

### Task 1: 后端 - 地区组织 API

**Files:**
- Create: `backend/src/controllers/region.controller.js`
- Create: `backend/src/routes/region.routes.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 1: 创建地区控制器**

```javascript
// backend/src/controllers/region.controller.js
const { Province, District, Group } = require('../models')
const { success, error } = require('../utils/response')

// 省份列表
exports.getProvinces = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      where: { status: 1 },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    })
    res.json(success(provinces))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 创建省份
exports.createProvince = async (req, res) => {
  try {
    const { name, code } = req.body
    const province = await Province.create({ name, code })
    res.json(success(province))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 分区列表
exports.getDistricts = async (req, res) => {
  try {
    const { provinceId } = req.params
    const districts = await District.findAll({
      where: { province_id: provinceId, status: 1 },
      include: [{ model: Province, as: 'province' }],
      order: [['sort_order', 'ASC']]
    })
    res.json(success(districts))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 创建分区
exports.createDistrict = async (req, res) => {
  try {
    const { province_id, name, code, leader_id } = req.body
    const district = await District.create({ province_id, name, code, leader_id })
    res.json(success(district))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 小组列表
exports.getGroups = async (req, res) => {
  try {
    const { districtId } = req.params
    const groups = await Group.findAll({
      where: { district_id: districtId, status: 1 },
      include: [{ model: District, as: 'district' }],
      order: [['code', 'ASC']]
    })
    res.json(success(groups))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 创建小组
exports.createGroup = async (req, res) => {
  try {
    const { district_id, name, code, leader_id } = req.body
    const group = await Group.create({ district_id, name, code, leader_id })
    res.json(success(group))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 完整地区树
exports.getRegionTree = async (req, res) => {
  try {
    const provinces = await Province.findAll({
      where: { status: 1 },
      include: [{
        model: District,
        as: 'districts',
        where: { status: 1 },
        required: false,
        include: [{
          model: Group,
          as: 'groups',
          where: { status: 1 },
          required: false
        }]
      }],
      order: [['sort_order', 'ASC']]
    })
    res.json(success(provinces))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}
```

- [ ] **Step 2: 创建地区路由**

```javascript
// backend/src/routes/region.routes.js
const express = require('express')
const router = express.Router()
const regionController = require('../controllers/region.controller')
const { auth } = require('../middleware/auth')

router.get('/provinces', auth, regionController.getProvinces)
router.post('/provinces', auth, regionController.createProvince)
router.get('/provinces/:provinceId/districts', auth, regionController.getDistricts)
router.post('/districts', auth, regionController.createDistrict)
router.get('/districts/:districtId/groups', auth, regionController.getGroups)
router.post('/groups', auth, regionController.createGroup)
router.get('/tree', auth, regionController.getRegionTree)

module.exports = router
```

- [ ] **Step 3: 注册路由到主路由**

```javascript
// 在 backend/src/routes/index.js 中添加
const regionRoutes = require('./region.routes')

// 在 module.exports 中添加
router.use('/regions', regionRoutes)
```

- [ ] **Step 4: 验证 API**

启动后端服务，访问 `GET /api/v1/regions/provinces` 验证返回数据

---

### Task 2: 后端 - 订单 API

**Files:**
- Create: `backend/src/controllers/order.controller.js`
- Create: `backend/src/services/order.service.js`
- Create: `backend/src/routes/order.routes.js`

- [ ] **Step 1: 创建订单服务层**

```javascript
// backend/src/services/order.service.js
const { Order, Group, District, Province, User, OrderAdItem, MeasureFace, MeasureReport, OrderLog } = require('../models')
const { Op } = require('sequelize')
const sequelize = require('../config/database').sequelize

// 生成订单编号
async function generateOrderNo(groupId) {
  const group = await Group.findByPk(groupId, {
    include: [{
      model: District,
      as: 'district',
      include: [{ model: Province, as: 'province' }]
    }]
  })
  
  if (!group) throw new Error('小组不存在')
  
  const now = new Date()
  const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`
  
  // 查询当月该小组最大流水号
  const lastOrder = await Order.findOne({
    where: {
      group_id: groupId,
      created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) }
    },
    order: [['order_no', 'DESC']]
  })
  
  let serial = 1
  if (lastOrder && lastOrder.order_no) {
    const parts = lastOrder.order_no.split('-')
    if (parts.length === 5) {
      serial = parseInt(parts[4]) + 1
    }
  }
  
  const provinceCode = group.district.province.code
  const districtCode = group.district.code
  const groupCode = group.code
  
  return `${provinceCode}-${districtCode}-${groupCode}-${yearMonth}-${serial.toString().padStart(4, '0')}`
}

// 创建订单
async function createOrder(data, userId) {
  const transaction = await sequelize.transaction()
  
  try {
    // 生成订单编号
    const orderNo = await generateOrderNo(data.group_id)
    
    // 创建订单
    const order = await Order.create({
      ...data,
      order_no: orderNo,
      status: 'pending_review',
      created_by: userId
    }, { transaction })
    
    // 记录日志
    await OrderLog.create({
      order_id: order.id,
      operator_id: userId,
      action: 'create',
      from_status: null,
      to_status: 'pending_review',
      remark: '创建订单'
    }, { transaction })
    
    await transaction.commit()
    return order
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

// 订单列表
async function getOrderList(params) {
  const { page = 1, pageSize = 20, status, keyword, group_id, start_date, end_date } = params
  
  const where = {}
  
  if (status && status !== 'all') {
    where.status = status
  }
  
  if (group_id) {
    where.group_id = group_id
  }
  
  if (keyword) {
    where[Op.or] = [
      { order_no: { [Op.like]: `%${keyword}%` } },
      { title: { [Op.like]: `%${keyword}%` } },
      { customer_name: { [Op.like]: `%${keyword}%` } }
    ]
  }
  
  if (start_date && end_date) {
    where.created_at = {
      [Op.between]: [new Date(start_date), new Date(end_date)]
    }
  }
  
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: Group, as: 'group' },
      { model: User, as: 'customer' },
      { model: User, as: 'handler' }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(pageSize),
    offset: (parseInt(page) - 1) * parseInt(pageSize)
  })
  
  return { total: count, list: rows, page: parseInt(page), pageSize: parseInt(pageSize) }
}

// 订单详情
async function getOrderDetail(orderId) {
  return await Order.findByPk(orderId, {
    include: [
      { model: Group, as: 'group', include: [{ model: District, as: 'district' }] },
      { model: User, as: 'customer' },
      { model: User, as: 'handler' },
      { model: OrderAdItem, as: 'adItems' },
      { model: MeasureReport, as: 'measureReport' },
      { model: OrderLog, as: 'logs', include: [{ model: User, as: 'operator' }] }
    ]
  })
}

// 推进订单状态
async function advanceOrder(orderId, data, userId) {
  const { status, handler_id, remark } = data
  const order = await Order.findByPk(orderId)
  
  if (!order) throw new Error('订单不存在')
  
  const oldStatus = order.status
  order.status = status
  if (handler_id) order.current_handler_id = handler_id
  await order.save()
  
  // 记录日志
  await OrderLog.create({
    order_id: orderId,
    operator_id: userId,
    action: 'advance',
    from_status: oldStatus,
    to_status: status,
    remark: remark || '推进订单'
  })
  
  return order
}

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  advanceOrder,
  generateOrderNo
}
```

- [ ] **Step 2: 创建订单控制器**

```javascript
// backend/src/controllers/order.controller.js
const orderService = require('../services/order.service')
const { success, error } = require('../utils/response')

exports.create = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body, req.user.id)
    res.json(success(order, '订单创建成功'))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

exports.list = async (req, res) => {
  try {
    const result = await orderService.getOrderList(req.query)
    res.json(success(result))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

exports.detail = async (req, res) => {
  try {
    const order = await orderService.getOrderDetail(req.params.id)
    if (!order) {
      return res.status(404).json(error('订单不存在'))
    }
    res.json(success(order))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

exports.update = async (req, res) => {
  try {
    const order = await orderService.updateOrder(req.params.id, req.body)
    res.json(success(order))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

exports.advance = async (req, res) => {
  try {
    const order = await orderService.advanceOrder(req.params.id, req.body, req.user.id)
    res.json(success(order, '订单状态已更新'))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

exports.logs = async (req, res) => {
  try {
    const logs = await orderService.getOrderLogs(req.params.id)
    res.json(success(logs))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}
```

- [ ] **Step 3: 创建订单路由**

```javascript
// backend/src/routes/order.routes.js
const express = require('express')
const router = express.Router()
const orderController = require('../controllers/order.controller')
const { auth } = require('../middleware/auth')

router.post('/', auth, orderController.create)
router.get('/', auth, orderController.list)
router.get('/:id', auth, orderController.detail)
router.put('/:id', auth, orderController.update)
router.post('/:id/advance', auth, orderController.advance)
router.get('/:id/logs', auth, orderController.logs)

module.exports = router
```

- [ ] **Step 4: 注册订单路由**

在 `backend/src/routes/index.js` 中添加订单路由

---

### Task 3: 前端 - 订单列表页面

**Files:**
- Modify: `admin-web/src/pages/order/index.vue`
- Modify: `admin-web/src/api/index.js` (添加订单 API)

- [ ] **Step 1: 添加订单 API**

```javascript
// 在 admin-web/src/api/index.js 中已有 orderApi，确认并使用
```

- [ ] **Step 2: 实现订单列表页面**

```vue
<!-- admin-web/src/pages/order/index.vue -->
<template>
  <div class="order-list">
    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="pending_review" />
            <el-option label="测量中" value="measuring" />
            <el-option label="设计中" value="designing" />
            <el-option label="生产中" value="producing" />
            <el-option label="安装中" value="installing" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="订单号/客户/标题" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="$router.push('/orders/create')">
        <el-icon><Plus /></el-icon>
        新建订单
      </el-button>
    </div>

    <!-- 订单表格 -->
    <el-card>
      <el-table :data="orderList" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单编号" width="180" />
        <el-table-column prop="title" label="订单标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户" width="100" />
        <el-table-column prop="customer_phone" label="电话" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="handleView(row)">查看</el-button>
            <el-button text type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const orderList = ref([])

const filterForm = reactive({
  status: 'all',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const statusMap = {
  pending_review: { text: '待审核', type: 'warning' },
  measuring: { text: '测量中', type: 'primary' },
  measure_review: { text: '待审测量', type: 'warning' },
  designing: { text: '设计中', type: '' },
  design_review: { text: '待审设计', type: 'warning' },
  producing: { text: '生产中', type: 'info' },
  checking: { text: '核对中', type: 'info' },
  installing: { text: '安装中', type: 'success' },
  install_review: { text: '待审安装', type: 'warning' },
  archived: { text: '已归档', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusType = (status) => statusMap[status]?.type || ''
const formatDate = (date) => dayjs(date).format('YYYY-MM-DD HH:mm')

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await orderApi.getList({
      ...filterForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    orderList.value = res.data.list
    pagination.total = res.data.total
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchOrders()
}

const handleReset = () => {
  filterForm.status = 'all'
  filterForm.keyword = ''
  handleSearch()
}

const handleView = (row) => {
  router.push(`/orders/${row.id}`)
}

const handleEdit = (row) => {
  router.push(`/orders/${row.id}/edit`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该订单吗？', '提示', { type: 'warning' })
    await orderApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchOrders()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.order-list {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.action-bar {
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
```

- [ ] **Step 3: 验证页面**

访问 http://localhost:5184/orders 检查订单列表页面

---

### Task 4: 前端 - 新建订单页面

**Files:**
- Modify: `admin-web/src/pages/order/create.vue`

- [ ] **Step 1: 实现新建订单页面**

```vue
<!-- admin-web/src/pages/order/create.vue -->
<template>
  <div class="order-create">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>新建订单</span>
          <el-button text @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        
        <el-form-item label="客户姓名" prop="customer_name">
          <el-input v-model="form.customer_name" placeholder="请输入客户姓名" />
        </el-form-item>
        
        <el-form-item label="联系电话" prop="customer_phone">
          <el-input v-model="form.customer_phone" placeholder="请输入联系电话" />
        </el-form-item>
        
        <el-form-item label="订单标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入订单标题" />
        </el-form-item>

        <!-- 地区选择 -->
        <el-divider content-position="left">地区组织</el-divider>
        
        <el-form-item label="省份" prop="province_id">
          <el-select v-model="form.province_id" placeholder="选择省份" @change="handleProvinceChange">
            <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="分区" prop="district_id">
          <el-select v-model="form.district_id" placeholder="选择分区" @change="handleDistrictChange" :disabled="!form.province_id">
            <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="小组" prop="group_id">
          <el-select v-model="form.group_id" placeholder="选择小组" :disabled="!form.district_id">
            <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>

        <!-- 位置信息 -->
        <el-divider content-position="left">位置信息</el-divider>
        
        <el-form-item label="安装地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入安装地址" />
        </el-form-item>
        
        <el-form-item label="需求说明" prop="requirement">
          <el-input v-model="form.requirement" type="textarea" :rows="3" placeholder="请输入需求说明" />
        </el-form-item>
        
        <el-form-item label="期望完成日期">
          <el-date-picker v-model="form.expected_date" type="date" placeholder="选择日期" />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">提交订单</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi, regionApi } from '@/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  customer_name: '',
  customer_phone: '',
  title: '',
  province_id: null,
  district_id: null,
  group_id: null,
  address: '',
  requirement: '',
  expected_date: null
})

const rules = {
  customer_name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  customer_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  title: [{ required: true, message: '请输入订单标题', trigger: 'blur' }],
  group_id: [{ required: true, message: '请选择小组', trigger: 'change' }],
  address: [{ required: true, message: '请输入安装地址', trigger: 'blur' }]
}

const provinces = ref([])
const districts = ref([])
const groups = ref([])

// 加载省份
const loadProvinces = async () => {
  const res = await regionApi.getProvinces()
  provinces.value = res.data
}

// 省份变更
const handleProvinceChange = async () => {
  form.district_id = null
  form.group_id = null
  groups.value = []
  
  if (form.province_id) {
    const res = await regionApi.getDistricts(form.province_id)
    districts.value = res.data
  } else {
    districts.value = []
  }
}

// 分区变更
const handleDistrictChange = async () => {
  form.group_id = null
  
  if (form.district_id) {
    const res = await regionApi.getGroups(form.district_id)
    groups.value = res.data
  } else {
    groups.value = []
  }
}

// 提交
const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  try {
    const res = await orderApi.create(form)
    ElMessage.success('订单创建成功')
    router.push(`/orders/${res.data.id}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProvinces()
})
</script>

<style scoped>
.order-create {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
```

- [ ] **Step 2: 验证新建订单**

访问 http://localhost:5184/orders/create 测试表单提交

---

### Task 5: 前端 - 订单详情页面

**Files:**
- Modify: `admin-web/src/pages/order/detail.vue`

- [ ] **Step 1: 实现订单详情页面**

```vue
<!-- admin-web/src/pages/order/detail.vue -->
<template>
  <div class="order-detail" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <span>订单详情</span>
            <el-tag :type="getStatusType(order.status)" style="margin-left: 12px">
              {{ getStatusText(order.status) }}
            </el-tag>
          </div>
          <div>
            <el-button type="primary" @click="handleAdvance" v-if="canAdvance">推进流程</el-button>
            <el-button @click="$router.back()">返回</el-button>
          </div>
        </div>
      </template>

      <!-- 基本信息 -->
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单编号">{{ order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="订单标题">{{ order.title }}</el-descriptions-item>
        <el-descriptions-item label="客户姓名">{{ order.customer_name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ order.customer_phone }}</el-descriptions-item>
        <el-descriptions-item label="安装地址" :span="2">{{ order.address }}</el-descriptions-item>
        <el-descriptions-item label="需求说明" :span="2">{{ order.requirement || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(order.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="当前处理人">{{ order.handler?.real_name || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 操作日志 -->
    <el-card class="log-card">
      <template #header>
        <span>操作日志</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="log in logs"
          :key="log.id"
          :timestamp="formatDate(log.created_at)"
          placement="top"
        >
          <div class="log-item">
            <span class="log-operator">{{ log.operator?.real_name || '系统' }}</span>
            <span class="log-action">{{ log.action }}</span>
            <span class="log-remark">{{ log.remark }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 推进弹窗 -->
    <el-dialog v-model="advanceDialogVisible" title="推进订单" width="500px">
      <el-form :model="advanceForm" label-width="100px">
        <el-form-item label="目标状态">
          <el-select v-model="advanceForm.status">
            <el-option label="派单测量" value="measuring" />
            <el-option label="测量审核" value="measure_review" />
            <el-option label="派单设计" value="designing" />
            <el-option label="设计审核" value="design_review" />
            <el-option label="进入生产" value="producing" />
            <el-option label="物料核对" value="checking" />
            <el-option label="派单安装" value="installing" />
            <el-option label="安装审核" value="install_review" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理人">
          <el-select v-model="advanceForm.handler_id" placeholder="选择处理人" clearable>
            <el-option v-for="u in handlers" :key="u.id" :label="u.real_name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="advanceForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="advanceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="advanceLoading" @click="submitAdvance">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi, userApi } from '@/api'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const advanceLoading = ref(false)
const advanceDialogVisible = ref(false)

const order = ref({})
const logs = ref([])
const handlers = ref([])

const advanceForm = reactive({
  status: '',
  handler_id: null,
  remark: ''
})

const statusMap = {
  pending_review: { text: '待审核', type: 'warning' },
  measuring: { text: '测量中', type: 'primary' },
  measure_review: { text: '待审测量', type: 'warning' },
  designing: { text: '设计中', type: '' },
  design_review: { text: '待审设计', type: 'warning' },
  producing: { text: '生产中', type: 'info' },
  checking: { text: '核对中', type: 'info' },
  installing: { text: '安装中', type: 'success' },
  install_review: { text: '待审安装', type: 'warning' },
  archived: { text: '已归档', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusType = (status) => statusMap[status]?.type || ''
const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'

const canAdvance = computed(() => order.value.status !== 'archived')

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await orderApi.getDetail(route.params.id)
    order.value = res.data
    logs.value = res.data.logs || []
  } catch (err) {
    ElMessage.error('获取订单详情失败')
  } finally {
    loading.value = false
  }
}

const handleAdvance = () => {
  advanceDialogVisible.value = true
}

const submitAdvance = async () => {
  advanceLoading.value = true
  try {
    await orderApi.advance(order.value.id, advanceForm)
    ElMessage.success('订单状态已更新')
    advanceDialogVisible.value = false
    fetchOrder()
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    advanceLoading.value = false
  }
}

onMounted(() => {
  fetchOrder()
})
</script>

<style scoped>
.order-detail {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-card {
  margin-top: 16px;
}

.log-item {
  display: flex;
  gap: 8px;
}

.log-operator {
  font-weight: bold;
}
</style>
```

---

### Task 6: 前端 - 系统设置页面

**Files:**
- Modify: `admin-web/src/pages/settings/index.vue`

- [ ] **Step 1: 实现系统设置页面**

```vue
<!-- admin-web/src/pages/settings/index.vue -->
<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" @click="handleAddUser">新增用户</el-button>
          </div>
          <el-table :data="users" v-loading="usersLoading" stripe>
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="real_name" label="姓名" />
            <el-table-column prop="phone" label="电话" />
            <el-table-column prop="role" label="角色">
              <template #default="{ row }">
                <el-tag>{{ roleMap[row.role] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status ? 'success' : 'danger'">
                  {{ row.status ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button text type="primary" @click="handleEditUser(row)">编辑</el-button>
                <el-button text type="danger" @click="handleDeleteUser(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 地区管理 -->
      <el-tab-pane label="地区组织" name="regions">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" @click="handleAddRegion">新增地区</el-button>
          </div>
          <el-tree :data="regionTree" :props="{ label: 'name' }" default-expand-all>
            <template #default="{ node, data }">
              <div class="tree-node">
                <span>{{ data.name }}</span>
                <span class="tree-code">{{ data.code }}</span>
                <span class="tree-actions">
                  <el-button text size="small" @click="handleEditRegion(data)">编辑</el-button>
                </span>
              </div>
            </template>
          </el-tree>
        </div>
      </el-tab-pane>

      <!-- 广告类型 -->
      <el-tab-pane label="广告类型" name="adTypes">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" @click="handleAddAdType">新增类型</el-button>
          </div>
          <el-table :data="adTypes" v-loading="adTypesLoading" stripe>
            <el-table-column prop="name" label="类型名称" />
            <el-table-column prop="description" label="说明" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button text type="primary" @click="handleEditAdType(row)">编辑</el-button>
                <el-button text type="danger" @click="handleDeleteAdType(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi, regionApi, adTypeApi } from '@/api'

const activeTab = ref('users')

const roleMap = {
  admin: '管理员',
  reviewer: '审核主管',
  measurer: '测量员',
  designer: '设计师',
  producer: '生产员',
  checker: '核对员',
  installer: '安装员'
}

// 用户管理
const users = ref([])
const usersLoading = ref(false)

const loadUsers = async () => {
  usersLoading.value = true
  try {
    const res = await userApi.getList({ pageSize: 100 })
    users.value = res.data.list || res.data
  } finally {
    usersLoading.value = false
  }
}

const handleAddUser = () => {
  ElMessage.info('新增用户功能开发中')
}

const handleEditUser = (row) => {
  ElMessage.info('编辑用户功能开发中')
}

const handleDeleteUser = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除该用户？', '提示', { type: 'warning' })
    await userApi.delete(row.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (e) {}
}

// 地区管理
const regionTree = ref([])

const loadRegions = async () => {
  try {
    const res = await regionApi.getProvinces()
    regionTree.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const handleAddRegion = () => {
  ElMessage.info('新增地区功能开发中')
}

const handleEditRegion = (data) => {
  ElMessage.info('编辑地区功能开发中')
}

// 广告类型
const adTypes = ref([])
const adTypesLoading = ref(false)

const loadAdTypes = async () => {
  adTypesLoading.value = true
  try {
    const res = await adTypeApi.getList({ pageSize: 100 })
    adTypes.value = res.data.list || res.data
  } finally {
    adTypesLoading.value = false
  }
}

const handleAddAdType = () => {
  ElMessage.info('新增广告类型功能开发中')
}

const handleEditAdType = (row) => {
  ElMessage.info('编辑广告类型功能开发中')
}

const handleDeleteAdType = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除该类型？', '提示', { type: 'warning' })
    await adTypeApi.delete(row.id)
    ElMessage.success('删除成功')
    loadAdTypes()
  } catch (e) {}
}

onMounted(() => {
  loadUsers()
  loadRegions()
  loadAdTypes()
})
</script>

<style scoped>
.settings-page {
  padding: 0;
}

.tab-content {
  padding: 16px 0;
}

.action-bar {
  margin-bottom: 16px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.tree-code {
  color: #909399;
  font-size: 12px;
}

.tree-actions {
  margin-left: auto;
}
</style>
```

---

### Task 7: 后端 - 测量/设计/生产 API

**Files:**
- Create: `backend/src/controllers/measure.controller.js`
- Create: `backend/src/controllers/design.controller.js`
- Create: `backend/src/controllers/production.controller.js`
- Create: `backend/src/routes/measure.routes.js`
- Create: `backend/src/routes/design.routes.js`
- Create: `backend/src/routes/production.routes.js`

- [ ] **Step 1: 创建测量控制器**

```javascript
// backend/src/controllers/measure.controller.js
const { Order, MeasureReport, MeasureFace, OrderAdItem, User } = require('../models')
const { success, error } = require('../utils/response')
const sequelize = require('../config/database').sequelize

// 获取测量任务列表
exports.getTasks = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const where = { current_handler_id: req.user.id }
    
    if (status === 'measuring') {
      where.status = 'measuring'
    }
    
    const { count, rows } = await Order.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    })
    
    res.json(success({ total: count, list: rows }))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 获取测量详情
exports.getDetail = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [
        { model: OrderAdItem, as: 'adItems', include: [{ model: MeasureFace, as: 'faces' }] },
        { model: MeasureReport, as: 'measureReport' }
      ]
    })
    res.json(success(order))
  } catch (err) {
    res.status(500).json(error(err.message))
  }
}

// 提交测量报告
exports.submit = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    const { orderId } = req.params
    const { adItems, install_condition, remark } = req.body
    
    // 创建/更新测量报告
    const [report] = await MeasureReport.findOrCreate({
      where: { order_id: orderId },
      defaults: {
        order_id: orderId,
        measurer_id: req.user.id,
        install_condition,
        remark
      },
      transaction
    })
    
    // 保存测量面数据
    for (const item of adItems) {
      const orderAdItem = await OrderAdItem.create({
        order_id: orderId,
        ad_type_id: item.ad_type_id,
        quantity: item.quantity
      }, { transaction })
      
      for (const face of item.faces) {
        await MeasureFace.create({
          order_ad_item_id: orderAdItem.id,
          face_name: face.face_name,
          width: face.width,
          height: face.height,
          area: face.width * face.height,
          material_id: face.material_id,
          photos: face.photos,
          remark: face.remark
        }, { transaction })
      }
    }
    
    // 更新订单状态
    await Order.update(
      { status: 'measure_review' },
      { where: { id: orderId }, transaction }
    )
    
    await transaction.commit()
    res.json(success(report, '测量报告提交成功'))
  } catch (err) {
    await transaction.rollback()
    res.status(500).json(error(err.message))
  }
}

module.exports = exports
```

- [ ] **Step 2: 创建测量路由并注册**

---

### Task 8: 前端 - 测量管理页面

**Files:**
- Modify: `admin-web/src/pages/measure/index.vue`
- Create: `admin-web/src/pages/measure/report.vue`

- [ ] **Step 1: 实现测量任务列表页面**

- [ ] **Step 2: 实现测量报告录入页面**

---

### Task 9: 后端 - 审核与派单 API

**Files:**
- Create: `backend/src/controllers/review.controller.js`
- Create: `backend/src/controllers/dispatch.controller.js`

- [ ] **Step 1: 创建审核控制器**

- [ ] **Step 2: 创建派单控制器**

---

### Task 10: 前端 - 审核中心页面

**Files:**
- Modify: `admin-web/src/pages/review/index.vue`

- [ ] **Step 1: 实现审核中心页面**

---

## 执行顺序

1. **Task 1-2**: 后端 API 基础（地区、订单）
2. **Task 3-5**: 前端订单模块
3. **Task 6**: 系统设置页面
4. **Task 7-8**: 测量模块
5. **Task 9-10**: 审核派单模块

---

## 验收标准

- [ ] 所有 API 接口可通过 Postman 测试
- [ ] 前端页面功能正常，无控制台错误
- [ ] 订单创建流程完整
- [ ] 订单状态流转正确
- [ ] 测量报告可正常提交
