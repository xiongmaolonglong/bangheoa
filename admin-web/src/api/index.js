import axios from 'axios'
import { useAuthStore } from '../store/auth'
import router from '../router'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    // 静默失败，各页面自行处理 Demo 数据或错误
    return Promise.reject(err)
  }
)

export default api
