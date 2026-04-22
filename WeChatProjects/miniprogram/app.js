App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'https://bh.fsbhgg.com/api/v1',
    isLoggedIn: false
  },

  onLaunch: function() {
    var token = wx.getStorageSync('token')
    var userInfo = wx.getStorageSync('userInfo')

    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    } else {
      this.doWxLogin()
    }
  },

  doWxLogin: function() {
    var self = this
    wx.login({
      success: function(res) {
        if (res.code) {
          self.wxLoginSuccess(res.code)
        } else {
          console.error('wx.login 失败', res.errMsg)
        }
      }
    })
  },

  wxLoginSuccess: function(code) {
    var self = this
    doRequest(self, '/auth/wx-login', 'POST', { code: code })
      .then(function(result) {
        if (result.code === 0) {
          self.setLoginInfo(result.data.token, result.data.user)
        }
      })
      .catch(function(err) {
        console.error('微信登录失败', err)
      })
  },

  setLoginInfo: function(token, userInfo) {
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
  },

  logout: function() {
    this.globalData.token = ''
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  checkLogin: function() {
    return this.globalData.isLoggedIn
  }
})

function doRequest(app, url, method, data) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: app.globalData.baseUrl + url,
      method: method || 'GET',
      data: data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': app.globalData.token ? 'Bearer ' + app.globalData.token : ''
      },
      success: function(res) {
        resolve(res.data)
      },
      fail: reject
    })
  })
}
