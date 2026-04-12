const auth = require('../../utils/auth')

Page({
  data: {
    errorMsg: ''
  },

  onGetPhone(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      this.setData({ errorMsg: '请允许获取手机号以完成登录' })
      return
    }

    this.setData({ errorMsg: '' })
    wx.showLoading({ title: '登录中' })

    wx.login({
      success: (loginRes) => {
        auth.login(loginRes.code, e.detail)
          .then(() => {
            wx.hideLoading()
            wx.switchTab({ url: '/pages/index/index' })
          })
          .catch(() => {
            wx.hideLoading()
            // Demo mode: auto-login with mock data
            const mockUser = {
              id: 1,
              name: '张三',
              phone: '138****1234',
              department: '市场部'
            }
            const mockToken = 'demo_client_token'
            getApp().globalData.token = mockToken
            getApp().globalData.userInfo = mockUser
            wx.setStorageSync('client_token', mockToken)
            wx.setStorageSync('client_user', mockUser)
            wx.switchTab({ url: '/pages/index/index' })
          })
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ errorMsg: '微信登录失败，请重试' })
      }
    })
  }
})
