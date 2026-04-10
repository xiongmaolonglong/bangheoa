/**
 * 常量定义
 */
export class Constants {
  // 后端API基础地址,开发时替换为实际IP
  static readonly BASE_URL = 'http://192.168.1.100:3000/api/v1'

  // 存储Key
  static readonly KEY_TOKEN = 'auth_token'
  static readonly KEY_USER = 'user_info'
  static readonly KEY_IS_LOGIN = 'is_login'

  // 订单状态
  static readonly ORDER_STATUS = {
    PENDING_REVIEW: 'pending_review',
    MEASURING: 'measuring',
    MEASURE_REVIEW: 'measure_review',
    DESIGNING: 'designing',
    DESIGN_REVIEW: 'design_review',
    PRODUCING: 'producing',
    CHECKING: 'checking',
    INSTALLING: 'installing',
    INSTALL_REVIEW: 'install_review',
    ARCHIVED: 'archived',
    REJECTED: 'rejected'
  }

  // 状态显示文本
  static readonly STATUS_TEXT: Record<string, string> = {
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

  // 状态颜色
  static readonly STATUS_COLOR: Record<string, string> = {
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

  // 用户角色
  static readonly ROLES = {
    ADMIN: 'admin',
    REVIEWER: 'reviewer',
    MEASURER: 'measurer',
    DESIGNER: 'designer',
    PRODUCER: 'producer',
    CHECKER: 'checker',
    INSTALLER: 'installer'
  }

  // HTTP超时
  static readonly HTTP_TIMEOUT = 15000

  // 图片最大数量
  static readonly MAX_PHOTOS = 9
}
