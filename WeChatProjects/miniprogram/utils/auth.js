/**
 * 登录态管理工具
 */

const app = getApp()

/**
 * 检查是否登录
 */
const isLoggedIn = () => {
  return app.globalData.isLoggedIn
}

/**
 * 获取 Token
 */
const getToken = () => {
  return app.globalData.token
}

/**
 * 获取用户信息
 */
const getUserInfo = () => {
  return app.globalData.userInfo
}

/**
 * 保存认证信息
 */
const setAuth = (token, userInfo) => {
  app.setLoginInfo(token, userInfo)
}

/**
 * 清除认证信息
 */
const clearAuth = () => {
  app.logout()
}

/**
 * 执行微信登录
 */
const doWxLogin = () => {
  return app.doWxLogin()
}

/**
 * 需要登录的页面拦截
 * 在页面 onLoad 中调用
 */
const requireLogin = async () => {
  if (isLoggedIn()) {
    return true
  }

  // 尝试微信登录
  try {
    await doWxLogin()
    return true
  } catch (err) {
    console.error('登录失败', err)
    wx.showToast({
      title: '登录失败，请重试',
      icon: 'none'
    })
    return false
  }
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