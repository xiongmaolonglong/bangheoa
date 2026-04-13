/** 格式化金额 */
export function formatMoney(amount) {
  if (amount == null) return '¥0.00'
  return `¥${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
}

/** 格式化面积 */
export function formatArea(area) {
  if (area == null) return '0.00'
  return `${Number(area).toFixed(2)}㎡`
}

/** 格式化日期 */
export function formatDate(date) {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** 相对时间（x 天前） */
export function relativeTime(date) {
  if (!date) return '—'
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff/60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff/3600)} 小时前`
  if (diff < 604800) return `${Math.floor(diff/86400)} 天前`
  return formatDate(date)
}

/** 环节中文标签 */
export const STAGE_MAP = {
  declaration: '申报', approval: '审批', assignment: '派单',
  measurement: '测量', design: '设计', production: '生产',
  construction: '施工', finance: '费用', archive: '归档', aftersale: '售后'
}
