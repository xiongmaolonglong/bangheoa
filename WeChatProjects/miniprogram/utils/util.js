/**
 * 通用工具函数
 */

/**
 * 格式化日期
 * @param {Date|string|number} date
 * @param {string} format 格式，默认 'YYYY-MM-DD HH:mm:ss'
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 订单状态文字映射
 */
const orderStatusText = {
  'pending_review': '待审核',
  'measuring': '测量中',
  'measure_review': '待审核',
  'designing': '设计中',
  'design_review': '待审核',
  'producing': '生产中',
  'checking': '核对中',
  'installing': '安装中',
  'install_review': '待审核',
  'archived': '已归档',
  'rejected': '已驳回'
}

/**
 * 订单状态样式映射
 */
const orderStatusType = {
  'pending_review': 'warning',
  'measuring': 'primary',
  'measure_review': 'warning',
  'designing': 'primary',
  'design_review': 'warning',
  'producing': 'primary',
  'checking': 'primary',
  'installing': 'primary',
  'install_review': 'warning',
  'archived': 'success',
  'rejected': 'danger'
}

/**
 * 获取订单状态文字
 */
const getStatusText = (status) => {
  return orderStatusText[status] || status
}

/**
 * 获取订单状态样式类型
 */
const getStatusType = (status) => {
  return orderStatusType[status] || 'info'
}

/**
 * 防抖函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 */
const throttle = (fn, delay = 300) => {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

/**
 * 手机号验证
 */
const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 价格格式化（分转元）
 */
const formatPrice = (price) => {
  if (typeof price !== 'number') return '0.00'
  return (price / 100).toFixed(2)
}

/**
 * 显示成功提示
 */
const showSuccess = (title) => {
  wx.showToast({ title, icon: 'success' })
}

/**
 * 显示错误提示
 */
const showError = (title) => {
  wx.showToast({ title, icon: 'none' })
}

/**
 * 显示确认弹窗
 */
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

module.exports = {
  formatDate,
  getStatusText,
  getStatusType,
  debounce,
  throttle,
  isValidPhone,
  formatPrice,
  showSuccess,
  showError,
  showConfirm
}