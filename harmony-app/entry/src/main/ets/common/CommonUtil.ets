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
  const map: Record<string, string> = {
    'pending_review': '待审核',
    'measuring': '测量中',
    'measure_review': '待审测量',
    'designing': '设计中',
    'design_review': '待审设计',
    'producing': '生产中',
    'checking': '核对中',
    'installing': '安装中',
    'install_review': '待审安装',
    'archived': '已归档',
    'rejected': '已驳回'
  }
  return map[status] || status
}

/**
 * 获取订单状态颜色
 */
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'pending_review': '#E6A23C',
    'measuring': '#409EFF',
    'measure_review': '#E6A23C',
    'designing': '#909399',
    'design_review': '#E6A23C',
    'producing': '#409EFF',
    'checking': '#E6A23C',
    'installing': '#67C23A',
    'install_review': '#E6A23C',
    'archived': '#909399',
    'rejected': '#F56C6C'
  }
  return map[status] || '#909399'
}

/**
 * 解析JSON安全
 */
export function safeParseJSON(str: string): ESObject | null {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch (e) {
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
