import api from './index'

// ===== 通知 =====
export const getNotifications = (params) => api.get('/notifications', { params })
export const getUnreadCount = () => api.get('/notifications/unread-count')
export const markAsRead = (id) => api.put(`/notifications/${id}/read`)
export const markAllAsRead = () => api.put('/notifications/read-all')
