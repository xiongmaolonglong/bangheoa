App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'http://localhost:3000/api/v1',
    isLoggedIn: false
  },

  onLaunch() {
    // 检查是否有缓存的 token
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')

    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    } else {
      // 自动微信登录
      this.doWxLogin()
    }
  },

  // 微信登录
  doWxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              // 调用后端微信登录接口
              const result = await this.request({
                url: '/auth/wx-login',
                method: 'POST',
                data: { code: res.code }
              })

              if (result.code === 0) {
                this.setLoginInfo(result.data.token, result.data.user)
                resolve(result.data)
              } else {
                reject(result)
              }
            } catch (err) {
              console.error('微信登录失败', err)
              reject(err)
            }
          } else {
            console.error('wx.login 失败', res.errMsg)
            reject(res)
          }
        },
        fail: reject
      })
    })
  },

  // 登录成功后保存信息
  setLoginInfo(token, userInfo) {
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
  },

  // 退出登录
  logout() {
    this.globalData.token = ''
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  // 检查是否登录
  checkLogin() {
    return this.globalData.isLoggedIn
  },

  // 封装请求方法
  request(options) {
    const { url, method = 'GET', data = {} } = options

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : ''
        },
        success: (res) => {
          resolve(res.data)
        },
        fail: reject
      })
    })
  }
})
