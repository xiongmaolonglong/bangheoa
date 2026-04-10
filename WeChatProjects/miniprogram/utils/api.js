/**
 * API 接口统一管理
 */

const { get, post, put, del } = require('./request')

// ==================== 认证相关 ====================

// 微信登录
const wxLogin = (data) => post('/auth/wx-login', data, { showLoading: false })

// 绑定已有账号
const bindAccount = (data) => post('/auth/bind-account', data)

// 获取当前用户信息
const getProfile = () => get('/auth/profile')

// 修改密码
const changePassword = (data) => put('/auth/password', data)

// ==================== 订单相关 ====================

// 获取订单列表
const getOrders = (params) => get('/orders', params)

// 获取订单详情
const getOrderDetail = (id) => get(`/orders/${id}`)

// 创建订单
const createOrder = (data) => post('/orders', data)

// 更新订单
const updateOrder = (id, data) => put(`/orders/${id}`, data)

// 删除订单
const deleteOrder = (id) => del(`/orders/${id}`)

// 获取订单日志
const getOrderLogs = (id) => get(`/orders/${id}/logs`)

// 推进订单状态
const advanceOrder = (id, data) => post(`/orders/${id}/advance`, data)

// 获取订单位置列表（地图用）
const getOrderLocations = (params) => get('/orders/locations', params)

// ==================== 上传相关 ====================

// 上传图片
const uploadImage = (filePath) => {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const token = app.globalData.token || wx.getStorageSync('token')

    wx.uploadFile({
      url: app.globalData.baseUrl + '/upload/image',
      filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 0) {
          resolve(data.data)
        } else {
          wx.showToast({ title: data.message || '上传失败', icon: 'none' })
          reject(data)
        }
      },
      fail: (err) => {
        wx.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 上传多张图片
const uploadImages = (filePaths) => {
  return Promise.all(filePaths.map(path => uploadImage(path)))
}

// ==================== 通知相关 ====================

// 获取通知列表
const getNotifications = (params) => get('/notifications', params)

// 获取未读数量
const getUnreadCount = () => get('/notifications/unread-count')

// 标记已读
const markRead = (ids) => post('/notifications/read', { ids })

// 全部已读
const markAllRead = () => post('/notifications/read-all')

// ==================== 配置相关 ====================

// 获取系统常量
const getConstants = () => get('/config/constants')

// 获取订单状态配置
const getOrderStatus = () => get('/config/order-status')

// ==================== 地址相关 ====================

// 地址转经纬度
const geocode = (address) => get('/location/geocode', { address })

// 经纬度转地址
const reverseGeocode = (lng, lat) => get('/location/reverse', { lng, lat })

// ==================== 定位追踪相关 ====================

// 上报定位
const reportLocation = (data) => post('/location-track/report', data, { showLoading: false })

// 批量上报定位
const batchReportLocation = (data) => post('/location-track/batch-report', data, { showLoading: false })

// 获取某人轨迹
const getUserTrack = (userId, params) => get(`/location-track/track/${userId}`, params)

// ==================== 导出 ====================

module.exports = {
  // 认证
  wxLogin,
  bindAccount,
  getProfile,
  changePassword,

  // 订单
  getOrders,
  getOrderDetail,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderLogs,
  advanceOrder,
  getOrderLocations,

  // 上传
  uploadImage,
  uploadImages,

  // 通知
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,

  // 配置
  getConstants,
  getOrderStatus,

  // 地址
  geocode,
  reverseGeocode,

  // 定位追踪
  reportLocation,
  batchReportLocation,
  getUserTrack,

  // 通用请求
  get,
  post,
  put,
  del
}