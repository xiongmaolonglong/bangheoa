import { http } from '@kit.NetworkKit'
import { Constants } from './Constants'
import { getString } from './StorageUtil'

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

interface HttpRequestOptions {
  method: http.RequestMethod
  header: ESObject
  extraData?: string
  readTimeout: number
  connectTimeout: number
}

/**
 * HTTP请求封装
 */
export class HttpUtil {
  private static instance: http.HttpRequest | null = null

  /**
   * 获取http实例
   */
  private static getHttp(): http.HttpRequest {
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
  private static async buildHeader(extraHeader: ESObject): Promise<ESObject> {
    const headers: ESObject = {}
    headers['Content-Type'] = 'application/json'
    const keys: string[] = Object.keys(extraHeader)
    keys.forEach((key: string) => {
      headers[key] = extraHeader[key]
    })
    const token: string = await HttpUtil.getToken()
    if (token.length > 0) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  /**
   * GET请求
   */
  static async get<T>(url: string, params?: ESObject, extraHeader?: ESObject): Promise<ApiResponse<T>> {
    let fullUrl: string = `${Constants.BASE_URL}${url}`
    if (params) {
      const queryParts: string[] = []
      const keys: string[] = Object.keys(params)
      keys.forEach((key: string) => {
        queryParts.push(`${key}=${params[key]}`)
      })
      if (queryParts.length > 0) {
        fullUrl += `?${queryParts.join('&')}`
      }
    }

    const headers: ESObject = await HttpUtil.buildHeader(extraHeader || {})
    const response: http.HttpResponse = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.GET,
      header: headers,
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    } as HttpRequestOptions)

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * POST请求
   */
  static async post<T>(url: string, data?: ESObject, extraHeader?: ESObject): Promise<ApiResponse<T>> {
    const fullUrl: string = `${Constants.BASE_URL}${url}`
    const headers: ESObject = await HttpUtil.buildHeader(extraHeader || {})
    const response: http.HttpResponse = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.POST,
      header: headers,
      extraData: data ? JSON.stringify(data) : '',
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    } as HttpRequestOptions)

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * PUT请求
   */
  static async put<T>(url: string, data?: ESObject, extraHeader?: ESObject): Promise<ApiResponse<T>> {
    const fullUrl: string = `${Constants.BASE_URL}${url}`
    const headers: ESObject = await HttpUtil.buildHeader(extraHeader || {})
    const response: http.HttpResponse = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.PUT,
      header: headers,
      extraData: data ? JSON.stringify(data) : '',
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    } as HttpRequestOptions)

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * DELETE请求
   */
  static async delete<T>(url: string, extraHeader?: ESObject): Promise<ApiResponse<T>> {
    const fullUrl: string = `${Constants.BASE_URL}${url}`
    const headers: ESObject = await HttpUtil.buildHeader(extraHeader || {})
    const response: http.HttpResponse = await HttpUtil.getHttp().request(fullUrl, {
      method: http.RequestMethod.DELETE,
      header: headers,
      readTimeout: Constants.HTTP_TIMEOUT,
      connectTimeout: Constants.HTTP_TIMEOUT
    } as HttpRequestOptions)

    return JSON.parse(response.result as string) as ApiResponse<T>
  }

  /**
   * 上传文件
   */
  static async upload<T>(_url: string, _filePath: string): Promise<T> {
    throw new Error('upload not implemented')
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
