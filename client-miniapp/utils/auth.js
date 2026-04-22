const api = require('./api')
const app = getApp()

function login(code, phone) {
  return api.post('/api/v1/auth/client/login', { code, phone }).then(res => {
    app.globalData.token = res.token
    app.globalData.userInfo = res.user
    wx.setStorageSync('client_token', res.token)
    wx.setStorageSync('client_user', res.user)
    return res
  })
}

function logout() {
  app.globalData.token = null
  app.globalData.userInfo = null
  wx.removeStorageSync('client_token')
  wx.removeStorageSync('client_user')
}

function isLoggedIn() {
  return !!(app.globalData.token || wx.getStorageSync('client_token'))
}

function getUserInfo() {
  return app.globalData.userInfo || wx.getStorageSync('client_user')
}

module.exports = {
  login,
  logout,
  isLoggedIn,
  getUserInfo
}
