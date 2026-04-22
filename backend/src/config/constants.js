// 订单状态常量
const ORDER_STATUS = {
  PENDING_REVIEW: 'pending_review',     // 待审核（小程序申请）
  DESIGNING: 'designing',               // 设计中
  DESIGN_REVIEW: 'design_review',       // 设计审核
  PRODUCING: 'producing',               // 生产中
  CHECKING: 'checking',                 // 核对中
  INSTALLING: 'installing',             // 安装中
  INSTALL_REVIEW: 'install_review',     // 安装审核
  ARCHIVED: 'archived',                 // 已归档
  REJECTED: 'rejected'                  // 已驳回
};

// 生产状态常量
const PRODUCTION_STATUS = {
  PENDING: 'pending',       // 待生产
  PRODUCING: 'producing',   // 生产中
  COMPLETED: 'completed'    // 已完成
};

// 生产类型常量
const PRODUCTION_TYPE = {
  INTERNAL: 'internal',     // 内部生产
  OUTSOURCE: 'outsource'    // 外协
};

// 用户角色常量
const USER_ROLES = {
  ADMIN: 'admin',           // 管理员
  DESIGNER: 'designer',     // 设计师
  PRODUCER: 'producer',     // 生产员
  FIELD_WORKER: 'field_worker', // 外勤人员（测量/安装/核对）
  CUSTOMER: 'customer'      // 客户（小程序用户）
};

// 表单字段类型
const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  PHONE: 'phone',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  IMAGE: 'image',
  LOCATION: 'location'
};

// 状态标签颜色
const STATUS_COLORS = {
  pending_review: 'warning',
  designing: '',
  design_review: '',
  producing: 'info',
  checking: 'info',
  installing: 'success',
  install_review: 'success',
  archived: 'info',
  rejected: 'danger'
};

// 状态中文名称
const STATUS_NAMES = {
  pending_review: '申请审核',
  designing: '设计中',
  design_review: '设计审核',
  producing: '生产中',
  checking: '核对中',
  installing: '安装中',
  install_review: '安装审核',
  archived: '已归档',
  rejected: '已驳回'
};

// 订单来源
const ORDER_SOURCE = {
  MINIPROGRAM: 'miniprogram',  // 小程序申请
  ADMIN: 'admin'               // 后台新建
};

// 审核类型映射（用于审核中心）
const REVIEW_TYPES = {
  pending_review: '申请审核',     // 小程序申请
  design_review: '设计审核',      // 设计方案
  install_review: '安装审核'      // 安装结果
};

module.exports = {
  ORDER_STATUS,
  PRODUCTION_STATUS,
  PRODUCTION_TYPE,
  USER_ROLES,
  FIELD_TYPES,
  STATUS_COLORS,
  STATUS_NAMES,
  ORDER_SOURCE,
  REVIEW_TYPES
};
