/**
 * 浏览器推送通知工具
 */

class NotificationService {
  constructor() {
    this.permission = Notification.permission
    this.supported = 'Notification' in window
  }

  /**
   * 请求通知权限
   */
  async requestPermission() {
    if (!this.supported) {
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    if (this.permission === 'denied') {
      return false
    }

    const result = await Notification.requestPermission()
    this.permission = result
    return result === 'granted'
  }

  /**
   * 发送桌面通知
   */
  async send(title, options = {}) {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) return null

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
      if (options.onClick) {
        options.onClick()
      }
    }

    return notification
  }

  /**
   * 发送订单状态变更通知
   */
  async notifyOrderStatus(orderNo, status, orderId) {
    const statusText = {
      'pending_review': '待审核',
      'designing': '设计中',
      'design_review': '待设计审核',
      'producing': '生产中',
      'checking': '核对中',
      'installing': '安装中',
      'install_review': '待安装审核',
      'archived': '已归档'
    }

    return this.send(`订单状态更新`, {
      body: `订单 ${orderNo} 已进入「${statusText[status] || status}」阶段`,
      tag: `order-${orderId}`,
      onClick: () => {
        window.location.href = `/orders/${orderId}`
      }
    })
  }

  /**
   * 发送任务分配通知
   */
  async notifyTaskAssigned(orderNo, taskType, orderId) {
    const typeText = {
      'design': '设计',
      'produce': '生产',
      'install': '安装'
    }

    return this.send('新任务分配', {
      body: `订单 ${orderNo} 需要您进行${typeText[taskType] || taskType}作业`,
      tag: `task-${orderId}`,
      onClick: () => {
        window.location.href = `/orders/${orderId}`
      }
    })
  }

  /**
   * 发送审核通知
   */
  async notifyReview(orderNo, approved, orderId) {
    return this.send(approved ? '审核通过' : '审核驳回', {
      body: `订单 ${orderNo} ${approved ? '已通过审核' : '被驳回'}`,
      tag: `review-${orderId}`,
      onClick: () => {
        window.location.href = `/orders/${orderId}`
      }
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService
