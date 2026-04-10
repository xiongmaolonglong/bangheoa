import { http } from '@kit.NetworkKit'
import { Constants } from './Constants'
import { getString, putString, remove, putBoolean } from './StorageUtil'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * HTTP请求封装
 */
export class HttpUtil {
  private static instance: http.HTTPRequest | null = null

  /**
   * 获取http实例
   */
  private static getHttp(): http.HTTPRequest {
    if (!HttpUtil.instance) {
      HttpUtil.instance = http.createHttp()
    }
    return HttpUtil.instance
  }

  /**
   * 获取Token
   */
  private static async getToken(): Promise<string> {
    return await getString(Constants.KEY_TOKEN, '')
  }

  /**
   * 请求拦截 - 添加Token
   */
  private static async buildHeader(header: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...header
    }
    const token = await HttpUtil.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  /**
   * GET请求
   */
  static async get<T>(url: string, params?: Record<string, string | number>, extraHeader?: Record<string, string>): Promise<ApiResponse<T>> {
    let fullUrl = `${Constants.BASE_URL}${url}`
    if (params) {
      const queryParts: string[] = []
      for (const key in params) {
        queryParts.push(`${key}=${params[key]}`)
      }
      if (queryParts.length > 0) {
        fullUrl += `?${queryParts.join('&')}`
      }
    }

    const headers = await HttpUtil.buildHeader(extraHeader || {})
    const response = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.GET,
      header: headers,
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    })

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * POST请求
   */
  static async post<T>(url: string, data?: ESObject, extraHeader?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = `${Constants.BASE_URL}${url}`
    const headers = await HttpUtil.buildHeader(extraHeader || {})
    const response = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.POST,
      header: headers,
      extraData: data ? JSON.stringify(data) : '',
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    })

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * PUT请求
   */
  static async put<T>(url: string, data?: ESObject, extraHeader?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = `${Constants.BASE_URL}${url}`
    const headers = await HttpUtil.buildHeader(extraHeader || {})
    const response = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.PUT,
      header: headers,
      extraData: data ? JSON.stringify(data) : '',
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    })

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * DELETE请求
   */
  static async delete<T>(url: string, extraHeader?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = `${Constants.BASE_URL}${url}`
    const headers = await HttpUtil.buildHeader(extraHeader || {})
    const response = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.DELETE,
      header: headers,
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    })

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * 上传文件
   */
  static async upload<T>(url: string, filePath: string): Promise<ApiResponse<T>> {
    const fullUrl = `${Constants.BASE_URL}${url}`
    const headers = await HttpUtil.buildHeader({})
    const token = await HttpUtil.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await HttpUtil.getHttp().upload(fullUrl, {
      method: http.RequestMethod.POST,
      header: headers,
      files: [
        {
          filename: 'file',
          name: 'file',
          uri: filePath,
          contentType: http.ContentType.OCTET_STREAM_TYPE
        }
      ]
    })

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * 清除http实例
   */
  static destroy(): void {
    if (HttpUtil.instance) {
      HttpUtil.instance.destroy()
      HttpUtil.instance = null
    }
  }
}
