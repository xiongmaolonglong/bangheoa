/**
 * 网络请求封装
 */

const app = getApp()

/**
 * 通用请求方法
 * @param {Object} options 请求配置
 * @returns {Promise}
 */
const request = (options) => {
  const { url, method = 'GET', data = {}, header = {}, showLoading = true } = options

  // 显示加载提示
  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true })
  }

  // 获取 token
  const token = app.globalData.token || wx.getStorageSync('token')

  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseUrl + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...header
      },
      success: (res) => {
        if (showLoading) {
          wx.hideLoading()
        }

        const { statusCode, data } = res

        // HTTP 状态码判断
        if (statusCode === 200) {
          // 业务状态码判断
          if (data.code === 0) {
            resolve(data)
          } else {
            // 业务错误
            wx.showToast({
              title: data.message || '请求失败',
              icon: 'none'
            })
            reject(data)
          }
        } else if (statusCode === 401) {
          // 未授权，跳转登录
          app.logout()
          wx.showToast({ title: '请先登录', icon: 'none' })
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/login/index' })
          }, 1500)
          reject(res)
        } else {
          // 其他 HTTP 错误
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
          reject(res)
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading()
        }
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

// GET 请求
const get = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

// POST 请求
const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

// PUT 请求
const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

// DELETE 请求
const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

module.exports = {
  request,
  get,
  post,
  put,
  del
}