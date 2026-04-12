App({
  globalData: {
    baseUrl: 'http://localhost:3000',
    userInfo: null,
    token: null
  },

  onLaunch() {
    const token = wx.getStorageSync('client_token')
    const userInfo = wx.getStorageSync('client_user')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  }
})
