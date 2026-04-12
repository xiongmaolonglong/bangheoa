const app = getApp()

function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options

  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('client_token')

    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...header
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('client_token')
          wx.removeStorageSync('client_user')
          wx.redirectTo({ url: '/pages/login/login' })
          reject(new Error('未登录'))
          return
        }

        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data.data)
        } else {
          const msg = res.data?.message || res.data?.error || '请求失败'
          wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail(err) {
        // Demo mode: when backend is unreachable, resolve with empty/null
        console.error('request fail:', err)
        reject(err)
      }
    })
  })
}

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data }),
  upload: (url, filePath, formData = {}) => {
    return new Promise((resolve, reject) => {
      const token = app.globalData.token || wx.getStorageSync('client_token')
      wx.uploadFile({
        url: `${app.globalData.baseUrl}${url}`,
        filePath,
        name: 'file',
        formData,
        header: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        success(res) {
          const data = JSON.parse(res.data)
          if (data.code === 0) {
            resolve(data.data)
          } else {
            wx.showToast({ title: data.message || '上传失败', icon: 'none' })
            reject(new Error(data.message))
          }
        },
        fail: reject
      })
    })
  }
}
