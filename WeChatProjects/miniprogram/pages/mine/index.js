const api = require('../../utils/api')
const { requireLogin, getUserInfo, clearAuth, doWxLogin } = require('../../utils/auth')
const { showSuccess, showError, showConfirm } = require('../../utils/util')

Page({
  data: {
    userInfo: {},
    stats: {
      pending: 0,
      measuring: 0,
      producing: 0,
      archived: 0
    },
    unreadCount: 0
  },

  async onLoad() {
    const loggedIn = await requireLogin()
    if (!loggedIn) return
  },

  async onShow() {
    const loggedIn = await requireLogin()
    if (loggedIn) {
      this.loadUserInfo()
      this.loadStats()
      this.loadUnreadCount()
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = getUserInfo()
    this.setData({ userInfo })
  },

  // 加载订单统计
  async loadStats() {
    try {
      const res = await api.getOrders({ pageSize: 1 })
      const orders = res.data.list || []

      const stats = {
        pending: orders.filter(o => o.status === 'pending_review').length,
        measuring: orders.filter(o => o.status === 'measuring').length,
        producing: orders.filter(o => o.status === 'producing').length,
        archived: orders.filter(o => o.status === 'archived').length
      }

      this.setData({ stats })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  // 加载未读数量
  async loadUnreadCount() {
    try {
      const res = await api.getUnreadCount()
      this.setData({ unreadCount: res.data.count || 0 })
    } catch (err) {
      console.error('加载未读数量失败', err)
    }
  },

  // 跳转订单列表
  goToOrders(e) {
    const status = e.currentTarget.dataset.status || ''
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 跳转地图
  goToMap() {
    wx.switchTab({ url: '/pages/map/index' })
  },

  // 跳转通知
  goToNotifications() {
    wx.switchTab({ url: '/pages/notification/index' })
  },

  // 修改密码
  changePassword() {
    wx.showModal({
      title: '修改密码',
      placeholderText: '请输入新密码',
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content) {
          if (res.content.length < 6) {
            showError('密码至少6位')
            return
          }
          try {
            await api.changePassword({ newPassword: res.content })
            showSuccess('密码已修改')
          } catch (err) {
            console.error('修改密码失败', err)
          }
        }
      }
    })
  },

  // 清除缓存
  async clearCache() {
    const confirmed = await showConfirm('确定要清除缓存吗？')
    if (!confirmed) return

    try {
      await wx.clearStorage()
      showSuccess('清除成功')
    } catch (err) {
      showError('清除失败')
    }
  },

  // 关于我们
  aboutUs() {
    wx.showModal({
      title: '关于我们',
      content: '户外广告测量安装派单系统\n版本：1.0.0\n\n为您提供便捷的广告测量申请服务',
      showCancel: false
    })
  },

  // 退出登录
  async logout() {
    const confirmed = await showConfirm('确定要退出登录吗？')
    if (!confirmed) return

    clearAuth()
    showSuccess('已退出登录')

    // 重新登录
    setTimeout(() => {
      doWxLogin().then(() => {
        this.loadUserInfo()
      })
    }, 1000)
  }
})