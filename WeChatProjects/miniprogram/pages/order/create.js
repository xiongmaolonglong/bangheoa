const api = require('../../utils/api')
const { requireLogin } = require('../../utils/auth')
const { showError, showSuccess, isValidPhone } = require('../../utils/util')

Page({
  data: {
    formData: {
      shop_name: '',
      shop_phone: '',
      element: '和成',
      salesman_name: '',
      salesman_phone: '',
      latitude: '',
      longitude: '',
      address: '',
      remark: ''
    },
    photos: [],
    submitting: false,
    safeAreaBottom: 0
  },

  onLoad() {
    this.setData({ safeAreaBottom: 0 })
    requireLogin(this.initPage.bind(this))
  },

  // 页面初始化（登录成功后执行）
  initPage: function() {
    this.loadSavedSalesman()
  },

  // 加载保存的业务员信息
  loadSavedSalesman() {
    const savedName = wx.getStorageSync('salesman_name')
    const savedPhone = wx.getStorageSync('salesman_phone')

    if (savedName && savedPhone) {
      this.setData({
        'formData.salesman_name': savedName,
        'formData.salesman_phone': savedPhone
      })
    }

    this.loadUserInfo()
  },

  // 从后端获取用户信息
  async loadUserInfo() {
    try {
      const res = await api.getProfile()
      if (res.data.salesman_name && res.data.salesman_phone) {
        this.setData({
          'formData.salesman_name': res.data.salesman_name,
          'formData.salesman_phone': res.data.salesman_phone
        })
      }
    } catch (err) {
      console.error('获取用户信息失败', err)
    }
  },

  // 输入事件
  onInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 选择元素
  selectElement(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      'formData.element': value
    })
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        let fullAddress = res.address || ''
        if (res.name && res.name !== res.address) {
          fullAddress = fullAddress ? `${fullAddress} ${res.name}` : res.name
        }

        this.setData({
          'formData.address': fullAddress,
          'formData.latitude': res.latitude,
          'formData.longitude': res.longitude
        })
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          showError('需要授权位置权限')
        }
      }
    })
  },

  // 拍照/选择照片
  takePhoto() {
    const remaining = 9 - this.data.photos.length
    if (remaining <= 0) {
      showError('最多上传9张照片')
      return
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['camera', 'album'], // 相机拍照 + 相册选择
      success: async (res) => {
        wx.showLoading({ title: '上传中...', mask: true })
        const tempFiles = res.tempFiles.map(f => f.tempFilePath)

        try {
          const uploadResults = await api.uploadImages(tempFiles)
          const newPhotos = uploadResults.map(r => r.url)
          this.setData({
            photos: [...this.data.photos, ...newPhotos]
          })
        } catch (err) {
          console.error('上传失败', err)
        } finally {
          wx.hideLoading()
        }
      }
    })
  },

  // 删除照片
  removePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = [...this.data.photos]
    photos.splice(index, 1)
    this.setData({ photos })
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data

    if (!formData.shop_name.trim()) {
      showError('请输入店铺名称')
      return false
    }
    if (!formData.shop_phone) {
      showError('请输入店铺电话')
      return false
    }
    if (!isValidPhone(formData.shop_phone)) {
      showError('店铺电话格式不正确')
      return false
    }
    if (!formData.element) {
      showError('请选择元素')
      return false
    }
    if (!formData.salesman_name.trim()) {
      showError('请输入业务员姓名')
      return false
    }
    if (!formData.salesman_phone) {
      showError('请输入业务员电话')
      return false
    }
    if (!isValidPhone(formData.salesman_phone)) {
      showError('业务员电话格式不正确')
      return false
    }
    if (!formData.latitude) {
      showError('请选择定位')
      return false
    }
    if (!formData.address.trim()) {
      showError('请输入详细地址')
      return false
    }

    return true
  },

  // 提交表单
  async handleSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })

    try {
      const { formData, photos } = this.data

      // 保存业务员信息
      wx.setStorageSync('salesman_name', formData.salesman_name)
      wx.setStorageSync('salesman_phone', formData.salesman_phone)

      try {
        await api.put('/users/profile', {
          salesman_name: formData.salesman_name,
          salesman_phone: formData.salesman_phone
        })
      } catch (err) {
        console.error('保存业务员信息到后端失败', err)
      }

      const submitData = {
        customer_name: formData.shop_name,
        customer_phone: formData.shop_phone,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        photos: photos.length > 0 ? photos : null,
        remark: `元素：${formData.element}\n业务员：${formData.salesman_name}\n业务员电话：${formData.salesman_phone}\n\n${formData.remark || ''}`,
        source: 'miniprogram'
      }

      await api.createOrder(submitData)
      showSuccess('提交成功')

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('提交失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})