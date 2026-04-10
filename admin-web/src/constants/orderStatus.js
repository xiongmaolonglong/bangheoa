export const ORDER_STATUS_MAP = {
  pending_review: { text: '申请审核', type: 'warning', cardKey: 'pending' },
  designing: { text: '设计中', type: '', cardKey: 'designing' },
  design_review: { text: '设计审核', type: 'warning', cardKey: 'pending' },
  producing: { text: '生产中', type: 'info', cardKey: 'producing' },
  checking: { text: '核对中', type: 'info', cardKey: 'checking' },
  installing: { text: '安装中', type: 'success', cardKey: 'installing' },
  install_review: { text: '安装审核', type: 'warning', cardKey: 'pending' },
  archived: { text: '已归档', type: 'success', cardKey: 'archived' },
  rejected: { text: '已驳回', type: 'danger', cardKey: 'rejected' }
}

export const getStatusText = (status) => ORDER_STATUS_MAP[status]?.text || status
export const getStatusType = (status) => ORDER_STATUS_MAP[status]?.type || ''
export const getCardKey = (status) => ORDER_STATUS_MAP[status]?.cardKey || status

// 订单来源
export const ORDER_SOURCE = {
  MINIPROGRAM: 'miniprogram',  // 小程序申请
  ADMIN: 'admin'               // 后台新建
}

// 审核类型
export const REVIEW_TYPES = {
  pending_review: '申请审核',     // 小程序申请
  design_review: '设计审核',      // 设计方案
  install_review: '安装审核'      // 安装结果
}
