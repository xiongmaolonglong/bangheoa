/**
 * 通用工具函数
 */

/**
 * 格式化日期
 */
export function formatDate(dateStr: string, format: string = 'YYYY-MM-DD HH:mm'): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 获取订单状态文本
 */
export function getStatusText(status: string): string {
  const map: ESObject = {}
  map['pending_review'] = '待审核'
  map['measuring'] = '测量中'
  map['measure_review'] = '待审测量'
  map['designing'] = '设计中'
  map['design_review'] = '待审设计'
  map['producing'] = '生产中'
  map['checking'] = '核对中'
  map['installing'] = '安装中'
  map['install_review'] = '待审安装'
  map['archived'] = '已归档'
  map['rejected'] = '已驳回'
  return map[status] || status
}

/**
 * 获取订单状态颜色
 */
export function getStatusColor(status: string): string {
  const map: ESObject = {}
  map['pending_review'] = '#E6A23C'
  map['measuring'] = '#409EFF'
  map['measure_review'] = '#E6A23C'
  map['designing'] = '#909399'
  map['design_review'] = '#E6A23C'
  map['producing'] = '#409EFF'
  map['checking'] = '#E6A23C'
  map['installing'] = '#67C23A'
  map['install_review'] = '#E6A23C'
  map['archived'] = '#909399'
  map['rejected'] = '#F56C6C'
  return map[status] || '#909399'
}

/**
 * 解析JSON安全
 */
export function safeParseJSON(str: string): ESObject | null {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch (_e) {
    return null
  }
}

/**
 * 手机号验证
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 相对时间
 */
export function relativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(dateStr, 'MM-DD')
}
