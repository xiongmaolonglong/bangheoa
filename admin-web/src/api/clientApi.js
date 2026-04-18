import axios from 'axios'

// 甲方客户端 API（连接 client-web 后端）
const clientApi = axios.create({
  baseURL: 'https://localhost:3002/api/v1',
  timeout: 10000
})

// 请求拦截器 - 添加 token
clientApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
clientApi.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err)
)

export default clientApi
