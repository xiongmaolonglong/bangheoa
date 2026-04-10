/**
 * 定位追踪工具
 * 用于小程序持续上报用户位置（安装员/测量员轨迹追踪）
 */

const api = require('./api')

let isTracking = false
let locationListener = null
let reportTimer = null
const REPORT_INTERVAL = 10000 // 上报间隔 10秒
const trackBuffer = [] // 本地缓存队列
const MAX_BUFFER = 100 // 最多缓存100条

/**
 * 开始持续定位追踪
 * @param {Object} options
 * @param {String} options.type - 上报类型: track(默认)/checkin/checkout
 * @param {Number} options.orderId - 关联订单ID
 * @param {Function} options.onLocation - 位置回调
 */
function startTracking(options = {}) {
  if (isTracking) return

  const { type = 'track', orderId = null, onLocation = null } = options

  isTracking = true

  // 开启持续定位（前台）
  wx.startLocationUpdate({
    success: () => {
      console.log('[LocationTrack] 定位服务已开启')
    },
    fail: (err) => {
      console.error('[LocationTrack] 开启定位服务失败', err)
      wx.showModal({
        title: '需要定位权限',
        content: '请在设置中允许使用您的位置信息，以便追踪作业轨迹',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) wx.openSetting()
        }
      })
      isTracking = false
    }
  })

  // 监听位置变化
  locationListener = wx.onLocationChange((res) => {
    if (!isTracking) return

    const record = {
      order_id: orderId,
      latitude: res.latitude,
      longitude: res.longitude,
      accuracy: Math.round(res.accuracy),
      speed: res.speed ? (res.speed * 3.6).toFixed(1) : null, // m/s 转 km/h
      type,
      battery: null,
      timestamp: Date.now()
    }

    // 获取电量
    wx.getBatteryInfo({
      success: (bat) => { record.battery = bat.level },
      fail: () => { record.battery = null }
    })

    // 回调
    if (onLocation) onLocation(record)

    // 加入缓存队列
    trackBuffer.push(record)
    if (trackBuffer.length > MAX_BUFFER) trackBuffer.shift()
  })

  // 立即上报一次
  reportOnce(type, orderId)

  // 定时批量上报
  reportTimer = setInterval(() => {
    batchReport()
  }, REPORT_INTERVAL)
}

/**
 * 停止定位追踪
 */
function stopTracking() {
  isTracking = false

  // 停止定位
  wx.stopLocationUpdate()

  // 清除监听
  if (locationListener) {
    locationListener = null
  }

  // 清除定时器
  if (reportTimer) {
    clearInterval(reportTimer)
    reportTimer = null
  }

  // 上报剩余缓存
  batchReport()

  console.log('[LocationTrack] 定位追踪已停止')
}

/**
 * 立即上报一次
 */
function reportOnce(type, orderId) {
  wx.getLocation({
    type: 'wgs84',
    isHighAccuracy: true,
    success: (res) => {
      wx.getBatteryInfo({
        success: (bat) => {
          api.reportLocation({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: Math.round(res.accuracy),
            speed: res.speed ? (res.speed * 3.6).toFixed(1) : null,
            type,
            battery: bat.level,
            order_id: orderId
          }).catch(() => {})
        },
        fail: () => {
          api.reportLocation({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: Math.round(res.accuracy),
            speed: res.speed ? (res.speed * 3.6).toFixed(1) : null,
            type,
            order_id: orderId
          }).catch(() => {})
        }
      })
    }
  })
}

/**
 * 批量上报缓存数据
 */
function batchReport() {
  if (trackBuffer.length === 0) return

  const batch = trackBuffer.splice(0, 20) // 每次最多上报20条

  api.batchReportLocation({ tracks: batch })
    .catch(() => {
      // 失败放回队列
      trackBuffer.unshift(...batch)
    })
}

/**
 * 签到（一次性上报）
 */
function checkin(orderId, callback) {
  wx.getLocation({
    type: 'wgs84',
    isHighAccuracy: true,
    success: (res) => {
      api.reportLocation({
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: Math.round(res.accuracy),
        type: 'checkin',
        order_id: orderId
      }).then(callback).catch(() => {})
    },
    fail: () => {
      wx.showToast({ title: '获取定位失败', icon: 'none' })
    }
  })
}

/**
 * 签退（一次性上报）
 */
function checkout(orderId, callback) {
  wx.getLocation({
    type: 'wgs84',
    isHighAccuracy: true,
    success: (res) => {
      api.reportLocation({
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: Math.round(res.accuracy),
        type: 'checkout',
        order_id: orderId
      }).then(callback).catch(() => {})
    },
    fail: () => {
      wx.showToast({ title: '获取定位失败', icon: 'none' })
    }
  })
}

/**
 * 是否正在追踪
 */
function isTrackingStatus() {
  return isTracking
}

/**
 * 获取缓存队列长度
 */
function getBufferLength() {
  return trackBuffer.length
}

module.exports = {
  startTracking,
  stopTracking,
  checkin,
  checkout,
  isTrackingStatus,
  getBufferLength
}
