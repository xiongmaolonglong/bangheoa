import { OrderApi, AuthApi, StatisticsApi, NotificationApi } from '../common/Api'
import { Constants } from '../common/Constants'
import { putString, getString, remove, putBoolean, getBoolean } from '../common/StorageUtil'
import { HttpUtil, ApiResponse } from '../common/HttpUtil'

/**
 * 全局应用状态 (AppStorage管理)
 */
export class AppViewModel {
  // 用户信息
  static setUserInfo(user: ESObject): void {
    AppStorage.setOrCreate<ESObject>('userInfo', user)
    putString(Constants.KEY_USER, JSON.stringify(user))
  }

  static getUserInfo(): ESObject | null {
    const user = AppStorage.get<ESObject>('userInfo')
    if (!user) {
      const str = getString(Constants.KEY_USER, '')
      if (str) {
        const parsed = JSON.parse(str) as ESObject
        AppStorage.setOrCreate<ESObject>('userInfo', parsed)
        return parsed
      }
    }
    return user || null
  }

  static clearUserInfo(): void {
    AppStorage.setOrCreate<ESObject>('userInfo', {})
    remove(Constants.KEY_USER)
  }

  // 登录状态
  static setLoggedIn(loggedIn: boolean): void {
    AppStorage.setOrCreate<boolean>('isLoggedIn', loggedIn)
    putBoolean(Constants.KEY_IS_LOGIN, loggedIn)
  }

  static isLoggedIn(): boolean {
    return AppStorage.get<boolean>('isLoggedIn') || false
  }

  // Token
  static setToken(token: string): void {
    AppStorage.setOrCreate<string>('token', token)
    putString(Constants.KEY_TOKEN, token)
  }

  static getToken(): string {
    return AppStorage.get<string>('token') || ''
  }

  static clearToken(): void {
    AppStorage.setOrCreate<string>('token', '')
    remove(Constants.KEY_TOKEN)
  }

  // 未读通知数
  static setUnreadCount(count: number): void {
    AppStorage.setOrCreate<number>('unreadCount', count)
  }

  static getUnreadCount(): number {
    return AppStorage.get<number>('unreadCount') || 0
  }

  // 任务统计
  static setTaskStats(stats: ESObject): void {
    AppStorage.setOrCreate<ESObject>('taskStats', stats)
  }

  static getTaskStats(): ESObject | null {
    return AppStorage.get<ESObject>('taskStats') || null
  }
}

/**
 * 登录ViewModel
 */
export class LoginViewModel {
  static async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await AuthApi.login({ username, password })
      if (res.code === 0 && res.data) {
        const data = res.data as ESObject
        AppViewModel.setToken(data.token as string)
        AppViewModel.setUserInfo(data.user as ESObject)
        AppViewModel.setLoggedIn(true)
        return true
      }
      return false
    } catch (e) {
      console.error('Login failed:', JSON.stringify(e))
      return false
    }
  }
}

/**
 * 首页ViewModel
 */
export class HomeViewModel {
  /**
   * 获取我的任务列表
   */
  static async getMyTasks(status?: string, page: number = 1, pageSize: number = 10): Promise<ESObject> {
    const params: Record<string, string | number> = { page, pageSize }
    if (status) {
      params['status'] = status
    }
    try {
      const res = await OrderApi.getList(params)
      if (res.code === 0) {
        return { list: res.data.list || [], total: res.data.total || 0, page, pageSize }
      }
    } catch (e) {
      console.error('Get tasks failed:', JSON.stringify(e))
    }
    return { list: [], total: 0, page, pageSize }
  }

  /**
   * 加载统计
   */
  static async loadStats(): Promise<void> {
    try {
      const res = await StatisticsApi.getMyTasks()
      if (res.code === 0 && res.data) {
        AppViewModel.setTaskStats(res.data as ESObject)
      }
    } catch (e) {
      console.error('Load stats failed:', JSON.stringify(e))
    }
  }

  /**
   * 推进订单状态
   */
  static async advanceOrder(orderId: number, action: string, data?: ESObject): Promise<boolean> {
    try {
      const payload: ESObject = { action, ...(data || {}) }
      const res = await OrderApi.advance(orderId, payload)
      return res.code === 0
    } catch (e) {
      console.error('Advance order failed:', JSON.stringify(e))
      return false
    }
  }
}

/**
 * 订单详情ViewModel
 */
export class OrderDetailViewModel {
  static async getDetail(orderId: number): Promise<ESObject | null> {
    try {
      const res = await OrderApi.getDetail(orderId)
      if (res.code === 0 && res.data) {
        return res.data as ESObject
      }
    } catch (e) {
      console.error('Get detail failed:', JSON.stringify(e))
    }
    return null
  }

  static async getLogs(orderId: number): Promise<ESObject[]> {
    try {
      const res = await OrderApi.getLogs(orderId)
      if (res.code === 0) {
        return res.data || []
      }
    } catch (e) {
      console.error('Get logs failed:', JSON.stringify(e))
    }
    return []
  }
}

/**
 * 通知ViewModel
 */
export class NotificationViewModel {
  static async getList(page: number = 1, pageSize: number = 20): Promise<ESObject> {
    try {
      const res = await NotificationApi.getList({ page, pageSize })
      if (res.code === 0) {
        return { list: res.data.list || [], total: res.data.total || 0 }
      }
    } catch (e) {
      console.error('Get notifications failed:', JSON.stringify(e))
    }
    return { list: [], total: 0 }
  }

  static async markRead(ids: number[]): Promise<void> {
    try {
      await NotificationApi.markRead(ids)
    } catch (e) {
      // silent
    }
  }

  static async loadUnreadCount(): Promise<void> {
    try {
      const res = await NotificationApi.getUnreadCount()
      if (res.code === 0) {
        AppViewModel.setUnreadCount(res.data.count || 0)
      }
    } catch (e) {
      // silent
    }
  }
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  try {
    await AuthApi.logout()
  } catch (e) {
    // 即使logout失败也要清除本地状态
  }
  AppViewModel.clearToken()
  AppViewModel.clearUserInfo()
  AppViewModel.setLoggedIn(false)
  AppViewModel.setUnreadCount(0)
}
