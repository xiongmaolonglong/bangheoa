/**
 * 常量工具函数
 * 从后端 API 动态获取常量配置，避免硬编码
 */
import { useConstantsStore } from '@/store/constants'

/**
 * 获取状态文本
 */
export function getStatusText(status) {
  const store = useConstantsStore()
  return store.getStatusLabel(status)
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status) {
  const store = useConstantsStore()
  return store.getStatusColor(status)
}

/**
 * 获取状态类型（用于 Element Plus Tag）
 */
export function getStatusType(status) {
  const color = getStatusColor(status)
  // 转换为 Element Plus Tag 类型
  const typeMap = {
    'warning': 'warning',
    'primary': 'primary',
    'info': 'info',
    'success': 'success',
    'danger': 'danger'
  }
  return typeMap[color] || ''
}

/**
 * 获取角色文本
 */
export function getRoleText(role) {
  const store = useConstantsStore()
  return store.getRoleLabel(role)
}

/**
 * 获取状态选项列表
 */
export function getStatusOptions() {
  const store = useConstantsStore()
  return store.statusOptions
}

/**
 * 获取角色选项列表
 */
export function getRoleOptions() {
  const store = useConstantsStore()
  return store.roleOptions
}

/**
 * 获取订单来源选项
 */
export function getSourceOptions() {
  const store = useConstantsStore()
  return store.sourceOptions
}

/**
 * 获取状态卡片 key
 */
export function getCardKey(status) {
  const store = useConstantsStore()
  return store.statusFlow[status]?.label || status
}

/**
 * 审核类型映射
 */
export function getReviewTypes() {
  const store = useConstantsStore()
  return store.reviewTypes
}

// 导出常量 Store 供直接使用
export { useConstantsStore }
