const { requireLogin } = require('../../utils/auth')

Page({
  data: {
    safeAreaBottom: 0
  },

  async onLoad() {
    // 获取安全区域，适配刘海屏
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      safeAreaBottom: systemInfo.safeArea ? systemInfo.safeArea.bottom : 0
    })

    await requireLogin()
  },

  // 跳转申请页面
  goToCreate() {
    wx.navigateTo({ url: '/pages/order/create' })
  }
})