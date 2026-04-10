/**
 * 订单数据模型
 */
export interface OrderModel {
  id: number
  order_no: string
  status: string
  customer_name: string
  customer_phone: string
  address: string
  province_code?: string
  province_name?: string
  district_name?: string
  group_name?: string
  description?: string
  assignee_id?: number
  assignee_name?: string
  creator_name: string
  latitude?: number
  longitude?: number
  photos?: string
  measure_faces?: MeasureFaceModel[]
  measure_report?: MeasureReportModel
  install_report?: InstallReportModel
  created_at: string
  updated_at: string
}

/**
 * 测量面数据模型
 */
export interface MeasureFaceModel {
  id: number
  order_id: number
  face_type: string
  width: number
  height: number
  quantity: number
  material?: string
  notes?: string
  photos?: string
}

/**
 * 测量报告数据模型
 */
export interface MeasureReportModel {
  id: number
  order_id: number
  reporter_name: string
  report_content: string
  faces: MeasureFaceModel[]
  photos: string[]
  created_at: string
}

/**
 * 安装报告数据模型
 */
export interface InstallReportModel {
  id: number
  order_id: number
  reporter_name: string
  install_content: string
  photos: string[]
  created_at: string
}

/**
 * 订单日志数据模型
 */
export interface OrderLogModel {
  id: number
  order_id: number
  action: string
  operator_name: string
  remark?: string
  created_at: string
}

/**
 * 用户数据模型
 */
export interface UserModel {
  id: number
  username: string
  real_name: string
  phone: string
  role: string
  department_id?: number
  department_name?: string
  status: number
  avatar?: string
  created_at: string
}

/**
 * 通知数据模型
 */
export interface NotificationModel {
  id: number
  user_id: number
  type: string
  title: string
  content: string
  order_id?: number
  order_no?: string
  is_read: boolean
  created_at: string
}
