const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { formatDate, getStatusText, getStatusType, showError, showSuccess, showConfirm } = require('../../utils/util')

Page({
  data: {
    orderId: null,
    order: null,
    logs: [],
    loading: true
  },

  async onLoad(options) {
    const loggedIn = await requireLogin()
    if (!loggedIn) return

    const { id } = options
    if (!id) {
      showError('订单不存在')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ orderId: id })
    this.loadOrderDetail()
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      const res = await api.getOrderDetail(this.data.orderId)
      const order = res.data

      order.statusText = getStatusText(order.status)
      order.statusType = getStatusType(order.status)
      order.created_at = formatDate(order.created_at, 'YYYY-MM-DD HH:mm')

      if (order.photos && typeof order.photos === 'string') {
        try {
          order.photos = JSON.parse(order.photos)
        } catch (e) {
          order.photos = []
        }
      }

      this.setData({ order, loading: false })
      this.loadOrderLogs()
    } catch (err) {
      this.setData({ loading: false })
      console.error('加载订单详情失败', err)
    }
  },

  // 加载订单日志
  async loadOrderLogs() {
    try {
      const res = await api.getOrderLogs(this.data.orderId)
      const logs = (res.data || []).map(item => ({
        ...item,
        created_at: formatDate(item.created_at, 'YYYY-MM-DD HH:mm')
      }))
      this.setData({ logs })
    } catch (err) {
      console.error('加载订单日志失败', err)
    }
  },

  // 拨打电话
  callPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    }
  },

  // 查看地图
  openMap() {
    const { order } = this.data
    if (order.latitude && order.longitude) {
      wx.openLocation({
        latitude: parseFloat(order.latitude),
        longitude: parseFloat(order.longitude),
        name: order.address || '安装位置',
        scale: 16
      })
    }
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: urls
    })
  },

  // 取消订单
  async cancelOrder() {
    const confirmed = await showConfirm('确定要取消此申请吗？')
    if (!confirmed) return

    try {
      await api.deleteOrder(this.data.orderId)
      showSuccess('已取消')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('取消失败', err)
    }
  },

  // 分享
  onShareAppMessage() {
    const { order } = this.data
    return {
      title: `订单详情 - ${order.order_no}`,
      path: `/pages/order/detail?id=${this.data.orderId}`
    }
  }
})