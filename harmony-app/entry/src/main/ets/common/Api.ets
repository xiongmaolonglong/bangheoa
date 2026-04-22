import { HttpUtil, ApiResponse, PageData } from '../common/HttpUtil'

/**
 * API接口统一管理 - 与后端REST API 1:1对应
 */
export class AuthApi {
  static login(data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post('/auth/login', data)
  }
  static getProfile(): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get('/auth/profile')
  }
  static changePassword(data: ESObject): Promise<ApiResponse<void>> {
    return HttpUtil.put('/auth/password', data)
  }
  static logout(): Promise<ApiResponse<void>> {
    return HttpUtil.post('/auth/logout')
  }
}

export class OrderApi {
  static getList(params?: ESObject): Promise<ApiResponse<PageData<ESObject>>> {
    return HttpUtil.get('/orders', params)
  }
  static getDetail(id: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/orders/${id}`)
  }
  static create(data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post('/orders', data)
  }
  static update(id: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.put(`/orders/${id}`, data)
  }
  static delete(id: string | number): Promise<ApiResponse<void>> {
    return HttpUtil.delete(`/orders/${id}`)
  }
  static getLogs(id: string | number): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get(`/orders/${id}/logs`)
  }
  static advance(id: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/orders/${id}/advance`, data)
  }
  static getLocations(params?: ESObject): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get('/orders/locations', params)
  }
}

export class MeasureApi {
  static getReport(orderId: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/measures/${orderId}/report`)
  }
  // 提交测量数据(通过advance接口)
  static submitMeasure(orderId: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/orders/${orderId}/advance`, data)
  }
}

export class InstallApi {
  static getTasks(params?: ESObject): Promise<ApiResponse<PageData<ESObject>>> {
    return HttpUtil.get('/installs/tasks', params)
  }
  static getDetail(orderId: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/installs/${orderId}`)
  }
  static getReport(orderId: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/installs/${orderId}/report`)
  }
  static submitReport(orderId: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/installs/${orderId}/report`, data)
  }
  static approve(orderId: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/installs/${orderId}/approve`)
  }
  static reject(orderId: string | number, reason: string): Promise<ApiResponse<ESObject>> {
    const body: ESObject = {}
    body['reason'] = reason
    return HttpUtil.post(`/installs/${orderId}/reject`, body)
  }
}

export class NotificationApi {
  static getList(params?: ESObject): Promise<ApiResponse<PageData<ESObject>>> {
    return HttpUtil.get('/notifications', params)
  }
  static getUnreadCount(): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get('/notifications/unread-count')
  }
  static markRead(ids: number[]): Promise<ApiResponse<void>> {
    const body: ESObject = {}
    body['ids'] = ids
    return HttpUtil.post('/notifications/read', body)
  }
  static markAllRead(): Promise<ApiResponse<void>> {
    return HttpUtil.post('/notifications/read-all')
  }
  static delete(id: number): Promise<ApiResponse<void>> {
    return HttpUtil.delete(`/notifications/${id}`)
  }
}

export class ReviewApi {
  static getPendingList(params?: ESObject): Promise<ApiResponse<PageData<ESObject>>> {
    return HttpUtil.get('/review/pending', params)
  }
  static getDetail(orderId: string | number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/review/${orderId}`)
  }
  static approve(orderId: string | number, data?: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/review/${orderId}/approve`, data)
  }
  static reject(orderId: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/review/${orderId}/reject`, data)
  }
  static dispatch(orderId: string | number, data: ESObject): Promise<ApiResponse<ESObject>> {
    return HttpUtil.post(`/review/${orderId}/dispatch`, data)
  }
}

export class LocationApi {
  static geocode(address: string): Promise<ApiResponse<ESObject>> {
    const body: ESObject = {}
    body['address'] = address
    return HttpUtil.get('/location/geocode', body)
  }
  static reverseGeocode(lng: number, lat: number): Promise<ApiResponse<ESObject>> {
    const params: ESObject = {}
    params['lng'] = lng
    params['lat'] = lat
    return HttpUtil.get('/location/reverse', params)
  }
}

export class LocationTrackApi {
  static reportLocation(data: ESObject): Promise<ApiResponse<void>> {
    return HttpUtil.post('/location-track/report', data)
  }
  static getTrackers(params?: ESObject): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get('/location-track/trackers', params)
  }
  static getUserTrack(userId: string | number, params?: ESObject): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get(`/location-track/track/${userId}`, params)
  }
}

export class StatisticsApi {
  static getMyTasks(): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get('/statistics/my-tasks')
  }
  static getDashboard(): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get('/statistics/dashboard')
  }
}

export class ConfigApi {
  static getConstants(): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get('/config/constants')
  }
  static getOrderStatus(): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get('/config/order-status')
  }
}

export class RegionApi {
  static getProvinces(): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get('/regions/provinces')
  }
  static getDistricts(provinceId: number): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get(`/regions/provinces/${provinceId}/districts`)
  }
  static getGroups(districtId: number): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get(`/regions/districts/${districtId}/groups`)
  }
}

export class AdTypeApi {
  static getList(params?: ESObject): Promise<ApiResponse<ESObject[]>> {
    return HttpUtil.get('/ad-types', params)
  }
  static getConfig(id: number): Promise<ApiResponse<ESObject>> {
    return HttpUtil.get(`/ad-types/${id}/config`)
  }
}
