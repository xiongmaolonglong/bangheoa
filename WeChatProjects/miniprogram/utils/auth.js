/**
 * 登录态管理工具
 * 不依赖 getApp()，直接使用 wx API
 */

/**
 * 检查是否登录
 */
const isLoggedIn = () => {
  return wx.getStorageSync('token') !== '' && wx.getStorageSync('token') !== null
}

/**
 * 获取 Token
 */
const getToken = () => {
  return wx.getStorageSync('token')
}

/**
 * 获取用户信息
 */
const getUserInfo = () => {
  return wx.getStorageSync('userInfo')
}

/**
 * 保存认证信息
 */
const setAuth = (token, userInfo) => {
  wx.setStorageSync('token', token)
  wx.setStorageSync('userInfo', userInfo)
}

/**
 * 清除认证信息
 */
const clearAuth = () => {
  wx.removeStorageSync('token')
  wx.removeStorageSync('userInfo')
}

/**
 * 执行微信登录
 */
function doWxLogin() {
  return new Promise(function(resolve, reject) {
    wx.login({
      success: function(res) {
        if (res.code) {
          wx.request({
            url: 'https://bh.fsbhgg.com/api/v1/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            header: { 'Content-Type': 'application/json' },
            success: function(result) {
              if (result.data && result.data.code === 0) {
                setAuth(result.data.data.token, result.data.data.user)
                resolve(result.data.data)
              } else {
                reject(result.data)
              }
            },
            fail: reject
          })
        } else {
          reject(res)
        }
      },
      fail: reject
    })
  })
}

/**
 * 需要登录的页面拦截
 * 在页面 onLoad 中调用
 */
const requireLogin = function(callback) {
  if (isLoggedIn()) {
    if (callback) callback()
    return
  }

  // 尝试微信登录
  doWxLogin()
    .then(function() {
      if (callback) callback()
    })
    .catch(function(err) {
      console.error('登录失败', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    })
}

module.exports = {
  isLoggedIn,
  getToken,
  getUserInfo,
  setAuth,
  clearAuth,
  doWxLogin,
  requireLogin
}
