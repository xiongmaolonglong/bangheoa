const { requireLogin } = require('../../utils/auth')

Page({
  data: {
    safeAreaBottom: 0
  },

  onLoad() {
    this.setData({ safeAreaBottom: 0 })
    requireLogin()
  },

  goToCreate() {
    wx.navigateTo({ url: '/pages/order/create' })
  }
})