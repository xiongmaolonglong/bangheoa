const { PROJECT_TYPES } = require('../../utils/constant')

const DRAFT_KEY = 'declare_draft'

const typeLabels = PROJECT_TYPES.map(t => t.label)

Page({
  data: {
    form: {
      title: '',
      type: '',
      detailAddress: '',
      description: ''
    },
    typeIndex: -1,
    typeLabels,
    addressText: '',
    photos: []
  },

  onLoad() {
    // Restore draft
    const draft = wx.getStorageSync(DRAFT_KEY)
    if (draft) {
      this.setData({
        form: draft.form || this.data.form,
        typeIndex: draft.typeIndex !== undefined ? draft.typeIndex : -1,
        addressText: draft.addressText || '',
        photos: draft.photos || []
      })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
  },

  onTypeChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      typeIndex: index,
      'form.type': PROJECT_TYPES[index].value
    })
  },

  showAddressPicker() {
    wx.showToast({ title: '请选择地址', icon: 'none' })
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPhotos = [...this.data.photos]
        res.tempFiles.forEach(f => {
          if (f.size <= 10 * 1024 * 1024) {
            newPhotos.push(f.tempFilePath)
          }
        })
        this.setData({ photos: newPhotos })
      }
    })
  },

  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    })
  },

  deletePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos.filter((_, i) => i !== index)
    this.setData({ photos })
  },

  saveDraft() {
    wx.setStorageSync(DRAFT_KEY, {
      form: this.data.form,
      typeIndex: this.data.typeIndex,
      addressText: this.data.addressText,
      photos: this.data.photos
    })
    wx.showToast({ title: '草稿已保存', icon: 'success' })
  },

  onSubmit() {
    const { form, typeIndex, photos } = this.data

    if (!form.title) return wx.showToast({ title: '请输入项目名称', icon: 'none' })
    if (typeIndex < 0) return wx.showToast({ title: '请选择项目类型', icon: 'none' })
    if (!form.detailAddress) return wx.showToast({ title: '请输入详细地址', icon: 'none' })
    if (!form.description) return wx.showToast({ title: '请输入需求描述', icon: 'none' })

    wx.showLoading({ title: '提交中' })

    // Demo: simulate submission
    setTimeout(() => {
      wx.hideLoading()
      wx.removeStorageSync(DRAFT_KEY)
      wx.showToast({ title: '申报已提交', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/declare-detail/declare-detail?id=99' })
      }, 1500)
    }, 1000)
  }
})
