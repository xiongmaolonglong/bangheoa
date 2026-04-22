import request from './request'

/**
 * 认证相关 API
 */
export const authApi = {
  // 登录
  login: (data) => request.post('/auth/login', data),

  // 退出登录
  logout: () => request.post('/auth/logout'),

  // 获取当前用户信息
  getProfile: () => request.get('/auth/profile'),

  // 修改密码
  changePassword: (data) => request.put('/auth/password', data)
}

/**
 * 用户管理 API
 */
export const userApi = {
  // 获取用户列表
  getList: (params) => request.get('/users', { params }),

  // 获取用户详情
  getDetail: (id) => request.get(`/users/${id}`),

  // 创建用户
  create: (data) => request.post('/users', data),

  // 更新用户
  update: (id, data) => request.put(`/users/${id}`, data),

  // 删除用户
  delete: (id) => request.delete(`/users/${id}`),

  // 更新用户状态
  updateStatus: (id, status) => request.put(`/users/${id}/status`, { status }),

  // 获取处理人列表（用于派单/筛选）
  getHandlers: (params) => request.get('/users/handlers', { params })
}

/**
 * 地区组织 API
 */
export const regionApi = {
  // 省份列表
  getProvinces: (params) => request.get('/regions/provinces', { params }),

  // 分区列表
  getDistricts: (provinceId) => request.get(`/regions/provinces/${provinceId}/districts`),

  // 小组列表
  getGroups: (districtId) => request.get(`/regions/districts/${districtId}/groups`),

  // 地区树
  getTree: () => request.get('/regions/tree'),

  // 创建省份
  createProvince: (data) => request.post('/regions/provinces', data),

  // 创建分区
  createDistrict: (data) => request.post('/regions/districts', data),

  // 创建小组
  createGroup: (data) => request.post('/regions/groups', data),

  // 更新
  updateProvince: (id, data) => request.put(`/regions/provinces/${id}`, data),
  updateDistrict: (id, data) => request.put(`/regions/districts/${id}`, data),
  updateGroup: (id, data) => request.put(`/regions/groups/${id}`, data),

  // 删除
  deleteProvince: (id) => request.delete(`/regions/provinces/${id}`),
  deleteDistrict: (id) => request.delete(`/regions/districts/${id}`),
  deleteGroup: (id) => request.delete(`/regions/groups/${id}`)
}

/**
 * 广告类型 API
 */
export const adTypeApi = {
  getList: (params) => request.get('/ad-types', { params }),
  getDetail: (id) => request.get(`/ad-types/${id}`),
  getConfig: (id) => request.get(`/ad-types/${id}/config`),
  getUsage: () => request.get('/ad-types/usage'),
  create: (data) => request.post('/ad-types', data),
  update: (id, data) => request.put(`/ad-types/${id}`, data),
  delete: (id) => request.delete(`/ad-types/${id}`),
  exportConfig: () => request.get('/ad-types/export'),
  importConfig: (data) => request.post('/ad-types/import', data)
}

/**
 * 面配置 API
 */
export const faceApi = {
  getList: () => request.get('/faces'),
  getById: (id) => request.get(`/faces/${id}`),
  create: (data) => request.post('/faces', data),
  update: (id, data) => request.put(`/faces/${id}`, data),
  delete: (id) => request.delete(`/faces/${id}`)
}

/**
 * 属性模板 API
 */
export const attributeApi = {
  // 模板
  getTemplates: () => request.get('/attributes/templates'),
  getTemplateById: (id) => request.get(`/attributes/templates/${id}`),
  createTemplate: (data) => request.post('/attributes/templates', data),
  updateTemplate: (id, data) => request.put(`/attributes/templates/${id}`, data),
  deleteTemplate: (id) => request.delete(`/attributes/templates/${id}`),

  // 字段
  getFields: (templateId) => request.get('/attributes/fields', { params: { template_id: templateId } }),
  createField: (data) => request.post('/attributes/fields', data),
  updateField: (id, data) => request.put(`/attributes/fields/${id}`, data),
  deleteField: (id) => request.delete(`/attributes/fields/${id}`)
}

/**
 * 材质 API
 */
export const materialApi = {
  getList: (params) => request.get('/materials', { params }),
  getDetail: (id) => request.get(`/materials/${id}`),
  create: (data) => request.post('/materials', data),
  update: (id, data) => request.put(`/materials/${id}`, data),
  delete: (id) => request.delete(`/materials/${id}`)
}

/**
 * 订单 API
 */
export const orderApi = {
  // 获取订单列表
  getList: (params) => request.get('/orders', { params }),

  // 获取订单详情
  getDetail: (id) => request.get(`/orders/${id}`),

  // 创建订单
  create: (data) => request.post('/orders', data),

  // 更新订单
  update: (id, data) => request.put(`/orders/${id}`, data),

  // 删除订单
  delete: (id) => request.delete(`/orders/${id}`),

  // 批量删除订单
  batchDelete: (ids) => request.post('/orders/batch-delete', { ids }),

  // 获取订单日志
  getLogs: (id) => request.get(`/orders/${id}/logs`),

  // 推进订单状态
  advance: (id, data) => request.post(`/orders/${id}/advance`, data),

  // 获取订单经纬度（地图用）
  getLocations: (params) => request.get('/orders/locations', { params })
}

/**
 * 审核 API
 */
export const reviewApi = {
  // 获取待审核列表
  getPendingList: (params) => request.get('/review/pending', { params }),

  // 获取审核详情
  getDetail: (orderId) => request.get(`/review/${orderId}`),

  // 审核通过
  approve: (orderId, data) => request.post(`/review/${orderId}/approve`, data),

  // 审核驳回
  reject: (orderId, data) => request.post(`/review/${orderId}/reject`, data),

  // 派单
  dispatch: (orderId, data) => request.post(`/review/${orderId}/dispatch`, data),

  // 获取可派单用户
  getHandlers: (params) => request.get('/review/handlers', { params }),

  // 自动审核配置
  getAutoReviewConfig: () => request.get('/review/auto-review/config'),
  updateAutoReviewConfig: (data) => request.put('/review/auto-review/config', data),

  // 订单风险评估
  getOrderRisk: (orderId) => request.get(`/review/auto-review/${orderId}/risk`),

  // 手动触发预审核
  triggerPreReview: () => request.post('/review/auto-review/pre-review'),

  // 手动触发超时检查
  triggerTimeoutCheck: () => request.post('/review/auto-review/timeout-check')
}

/**
 * 测量 API
 */
export const measureApi = {
  // 获取测量报告
  getReport: (orderId) => request.get(`/measures/${orderId}/report`)
}

/**
 * 设计 API
 */
export const designApi = {
  getTasks: (params) => request.get('/designs/tasks', { params }),
  getDetail: (orderId) => request.get(`/designs/${orderId}`),
  getScheme: (orderId) => request.get(`/designs/${orderId}/scheme`),
  submitScheme: (orderId, data) => request.post(`/designs/${orderId}/scheme`, data)
}

/**
 * 设计管理 API (审核/派单)
 */
export const designManageApi = {
  dispatch: (orderId, data) => request.post(`/designs/manage/${orderId}/dispatch`, data),
  approve: (orderId, data) => request.post(`/designs/manage/${orderId}/approve`, data),
  reject: (orderId, data) => request.post(`/designs/manage/${orderId}/reject`, data),
  getDesigners: () => request.get('/designs/manage/designers')
}

/**
 * 生产 API
 */
export const productionApi = {
  // 获取任务列表
  getTasks: (params) => request.get('/productions/tasks', { params }),

  // 获取任务详情
  getDetail: (orderId) => request.get(`/productions/${orderId}`),

  // 更新测量面生产状态
  updateFace: (faceId, data) => request.put(`/productions/faces/${faceId}`, data),

  // 完成生产
  complete: (orderId) => request.post(`/productions/${orderId}/complete`),

  // 提交核对记录
  submitCheck: (orderId, data) => request.post(`/productions/${orderId}/check`, data),

  // 返工
  reject: (orderId, data) => request.post(`/productions/${orderId}/reject`, data)
}

/**
 * 安装 API
 */
export const installApi = {
  getTasks: (params) => request.get('/installs/tasks', { params }),
  getDetail: (orderId) => request.get(`/installs/${orderId}`),
  getReport: (orderId) => request.get(`/installs/${orderId}/report`),
  submitReport: (orderId, data) => request.post(`/installs/${orderId}/report`, data),
  updateReport: (orderId, data) => request.put(`/installs/${orderId}/report`, data),
  approve: (orderId) => request.post(`/installs/${orderId}/approve`),
  reject: (orderId, reason) => request.post(`/installs/${orderId}/reject`, { reason })
}

/**
 * 统计 API
 */
export const statisticsApi = {
  // 仪表盘数据
  getDashboard: () => request.get('/statistics/dashboard'),

  // 订单统计
  getOrderStats: (params) => request.get('/statistics/orders', { params }),

  // 人员绩效
  getPerformance: (params) => request.get('/statistics/performance', { params }),

  // 区域分布
  getRegionStats: (params) => request.get('/statistics/region', { params }),

  // 收入分析
  getRevenueStats: (params) => request.get('/statistics/revenue', { params }),

  // 效率指标
  getEfficiency: (params) => request.get('/statistics/efficiency', { params }),

  // 预警提醒
  getAlerts: () => request.get('/statistics/alerts'),

  // 我的待办任务
  getMyTasks: () => request.get('/statistics/my-tasks'),

  // 项目流水线
  getPipeline: () => request.get('/statistics/pipeline'),

  // 团队活跃
  getTeamActivity: () => request.get('/statistics/team-activity'),

  // 通知列表
  getNotifications: (params) => request.get('/statistics/notifications', { params }),

  // 标记单个通知已读
  markNotificationRead: (id) => request.put(`/statistics/notifications/${id}/read`),

  // 标记全部通知已读
  markAllNotificationsRead: () => request.put('/statistics/notifications/read-all')
}

/**
 * 上传 API
 */
export const uploadApi = {
  // 上传图片
  image: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // 上传文件
  file: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

/**
 * 通知 API
 */
export const notificationApi = {
  // 获取通知列表
  getList: (params) => request.get('/notifications', { params }),

  // 获取未读数量
  getUnreadCount: () => request.get('/notifications/unread-count'),

  // 标记已读
  markRead: (ids) => request.post('/notifications/read', { ids }),

  // 全部已读
  markAllRead: () => request.post('/notifications/read-all'),

  // 删除通知
  delete: (id) => request.delete(`/notifications/${id}`)
}

/**
 * 表单配置 API
 */
export const formApi = {
  // 获取完整表单配置
  getConfig: () => request.get('/forms/config'),

  // 分组管理
  getGroups: () => request.get('/forms/groups'),
  createGroup: (data) => request.post('/forms/groups', data),
  updateGroup: (id, data) => request.put(`/forms/groups/${id}`, data),
  deleteGroup: (id) => request.delete(`/forms/groups/${id}`),

  // 字段管理
  getFields: (groupId) => request.get('/forms/fields', { params: { group_id: groupId } }),
  createField: (data) => request.post('/forms/fields', data),
  updateField: (id, data) => request.put(`/forms/fields/${id}`, data),
  deleteField: (id) => request.delete(`/forms/fields/${id}`),
  updateSort: (items) => request.put('/forms/fields/sort', { items }),

  // 功能开关
  getFeatures: () => request.get('/forms/features'),
  saveFeatures: (data) => request.put('/forms/features', data)
}

/**
 * 系统配置 API
 */
export const configApi = {
  // 获取所有常量配置
  getConstants: () => request.get('/config/constants'),

  // 获取订单状态配置
  getOrderStatus: () => request.get('/config/order-status'),

  // 获取用户角色配置
  getUserRoles: () => request.get('/config/user-roles'),

  // 获取默认材质列表
  getMaterials: () => request.get('/config/materials'),

  // 更新默认材质列表
  updateMaterials: (materials) => request.put('/config/materials', { materials }),

  // 获取所有系统配置
  getAllConfigs: () => request.get('/config/all'),

  // 获取指定配置项
  getConfig: (key) => request.get(`/config/${key}`),

  // 更新指定配置项
  updateConfig: (key, data) => request.put(`/config/${key}`, data)
}

/**
 * 定位 API
 */
export const locationApi = {
  // 地理编码 - 根据地址获取经纬度
  geocode: (address) => request.get('/location/geocode', { params: { address } }),

  // 逆地理编码 - 根据经纬度获取地址
  reverseGeocode: (lng, lat) => request.get('/location/reverse', { params: { lng, lat } }),

  // 批量地理编码 - 为所有没有坐标的订单解析地址
  batchGeocode: () => request.post('/location/batch-geocode')
}

/**
 * 定位追踪 API（安装员/测量员实时定位）
 */
export const locationTrackApi = {
  // 获取所有在线外勤人员位置
  getTrackers: (params) => request.get('/location-track/trackers', { params }),

  // 获取某人轨迹详情
  getUserTrack: (userId, params) => request.get(`/location-track/track/${userId}`, { params })
}

/**
 * 派单规则 API
 */
export const dispatchRuleApi = {
  getList: (params) => request.get('/dispatch-rules', { params }),
  create: (data) => request.post('/dispatch-rules', data),
  update: (id, data) => request.put(`/dispatch-rules/${id}`, data),
  delete: (id) => request.delete(`/dispatch-rules/${id}`),
  toggle: (id) => request.post(`/dispatch-rules/${id}/toggle`)
}
