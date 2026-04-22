import { OrderApi, AuthApi, StatisticsApi, NotificationApi } from '../common/Api'
import { ApiResponse, PageData } from '../common/HttpUtil'
import { Constants } from '../common/Constants'
import { putString, getString, remove, putBoolean } from '../common/StorageUtil'

export interface TaskResult {
  list: ESObject[]
  total: number
  page: number
  pageSize: number
}

export interface NotifyResult {
  list: ESObject[]
  total: number
}

/**
 * 全局应用状态 (AppStorage管理)
 */
export class AppViewModel {
  static setUserInfo(user: ESObject): void {
    AppStorage.setOrCreate<ESObject>('userInfo', user)
    putString(Constants.KEY_USER, JSON.stringify(user))
  }

  static getUserInfo(): ESObject | null {
    const user: ESObject | null = AppStorage.get<ESObject>('userInfo')
    return user || null
  }

  static clearUserInfo(): void {
    const empty: ESObject = {}
    AppStorage.setOrCreate<ESObject>('userInfo', empty)
    remove(Constants.KEY_USER)
  }

  static setLoggedIn(loggedIn: boolean): void {
    AppStorage.setOrCreate<boolean>('isLoggedIn', loggedIn)
    putBoolean(Constants.KEY_IS_LOGIN, loggedIn)
  }

  static isLoggedIn(): boolean {
    const val: boolean | undefined = AppStorage.get<boolean>('isLoggedIn')
    return val || false
  }

  static setToken(token: string): void {
    AppStorage.setOrCreate<string>('token', token)
    putString(Constants.KEY_TOKEN, token)
  }

  static getToken(): string {
    const val: string | undefined = AppStorage.get<string>('token')
    return val || ''
  }

  static clearToken(): void {
    AppStorage.setOrCreate<string>('token', '')
    remove(Constants.KEY_TOKEN)
  }

  static setUnreadCount(count: number): void {
    AppStorage.setOrCreate<number>('unreadCount', count)
  }

  static getUnreadCount(): number {
    const val: number | undefined = AppStorage.get<number>('unreadCount')
    return val || 0
  }

  static setTaskStats(stats: ESObject): void {
    AppStorage.setOrCreate<ESObject>('taskStats', stats)
  }

  static getTaskStats(): ESObject | null {
    const val: ESObject | null = AppStorage.get<ESObject>('taskStats')
    return val || null
  }
}

export interface LoginResult {
  success: boolean
  message: string
}

/**
 * 登录ViewModel
 */
export class LoginViewModel {
  static async login(username: string, password: string): Promise<LoginResult> {
    try {
      const body: ESObject = {}
      body['username'] = username
      body['password'] = password
      const res: ApiResponse<ESObject> = await AuthApi.login(body)
      if (res.code === 0 && res.data) {
        const data: ESObject = res.data as ESObject
        AppViewModel.setToken(data['token'] as string)
        AppViewModel.setUserInfo(data['user'] as ESObject)
        AppViewModel.setLoggedIn(true)
        const ok: LoginResult = {} as LoginResult
        ok.success = true
        ok.message = ''
        return ok
      }
      const fail: LoginResult = {} as LoginResult
      fail.success = false
      fail.message = res.message || '登录失败'
      return fail
    } catch (_e) {
      console.error('Login failed:', JSON.stringify(_e))
      const err: LoginResult = {} as LoginResult
      err.success = false
      err.message = '网络错误,请检查后端地址'
      return err
    }
  }
}

/**
 * 首页ViewModel
 */
export class HomeViewModel {
  static async getMyTasks(status?: string, page: number = 1, pageSize: number = 10): Promise<TaskResult> {
    const params: ESObject = {}
    params['page'] = page
    params['pageSize'] = pageSize
    if (status) {
      params['status'] = status
    }
    try {
      const res: ApiResponse<PageData<ESObject>> = await OrderApi.getList(params)
      if (res.code === 0) {
        const result: TaskResult = {} as TaskResult
        result.list = res.data.list || []
        result.total = res.data.total || 0
        result.page = page
        result.pageSize = pageSize
        return result
      }
    } catch (_e) {
      console.error('Get tasks failed:', JSON.stringify(_e))
    }
    const empty: TaskResult = {} as TaskResult
    empty.list = []
    empty.total = 0
    empty.page = page
    empty.pageSize = pageSize
    return empty
  }

  static async loadStats(): Promise<void> {
    try {
      const res: ApiResponse<ESObject> = await StatisticsApi.getMyTasks()
      if (res.code === 0 && res.data) {
        AppViewModel.setTaskStats(res.data as ESObject)
      }
    } catch (_e) {
      console.error('Load stats failed:', JSON.stringify(_e))
    }
  }

  static async advanceOrder(orderId: number, action: string, data?: ESObject): Promise<boolean> {
    try {
      const payload: ESObject = {}
      payload['action'] = action
      if (data) {
        const keys: string[] = Object.keys(data)
        keys.forEach((key: string) => {
          payload[key] = data[key]
        })
      }
      const res: ApiResponse<ESObject> = await OrderApi.advance(orderId, payload)
      return res.code === 0
    } catch (_e) {
      console.error('Advance order failed:', JSON.stringify(_e))
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
      const res: ApiResponse<ESObject> = await OrderApi.getDetail(orderId)
      if (res.code === 0 && res.data) {
        return res.data as ESObject
      }
    } catch (_e) {
      console.error('Get detail failed:', JSON.stringify(_e))
    }
    return null
  }

  static async getLogs(orderId: number): Promise<ESObject[]> {
    try {
      const res: ApiResponse<ESObject[]> = await OrderApi.getLogs(orderId)
      if (res.code === 0) {
        return res.data || []
      }
    } catch (_e) {
      console.error('Get logs failed:', JSON.stringify(_e))
    }
    return []
  }
}

/**
 * 通知ViewModel
 */
export class NotificationViewModel {
  static async getList(page: number = 1, pageSize: number = 20): Promise<NotifyResult> {
    const params: ESObject = {}
    params['page'] = page
    params['pageSize'] = pageSize
    try {
      const res: ApiResponse<PageData<ESObject>> = await NotificationApi.getList(params)
      if (res.code === 0) {
        const result: NotifyResult = {} as NotifyResult
        result.list = res.data.list || []
        result.total = res.data.total || 0
        return result
      }
    } catch (_e) {
      console.error('Get notifications failed:', JSON.stringify(_e))
    }
    const empty: NotifyResult = {} as NotifyResult
    empty.list = []
    empty.total = 0
    return empty
  }

  static async markRead(ids: number[]): Promise<void> {
    try {
      await NotificationApi.markRead(ids)
    } catch (_e) {
      // silent
    }
  }

  static async loadUnreadCount(): Promise<void> {
    try {
      const res: ApiResponse<ESObject> = await NotificationApi.getUnreadCount()
      if (res.code === 0) {
        const data: ESObject = res.data as ESObject
        AppViewModel.setUnreadCount((data['count'] as number) || 0)
      }
    } catch (_e) {
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
  } catch (_e) {
    // silent
  }
  AppViewModel.clearToken()
  AppViewModel.clearUserInfo()
  AppViewModel.setLoggedIn(false)
  AppViewModel.setUnreadCount(0)
}
