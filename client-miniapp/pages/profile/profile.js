const auth = require('../../utils/auth')

Page({
  data: {
    userInfo: { name: '', phone: '', department: '' }
  },

  onLoad() {
    const user = auth.getUserInfo() || {}
    this.setData({ userInfo: user })
  },

  onShow() {
    const user = auth.getUserInfo()
    if (user) this.setData({ userInfo: user })
  },

  onNotification() {
    wx.showToast({ title: '暂不支持', icon: 'none' })
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '广告工程申报小程序 v1.0.0\n用于现场申报、进度跟踪和通知接收。',
      showCancel: false
    })
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  }
})
