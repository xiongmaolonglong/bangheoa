import { defineStore } from 'pinia'
import { authApi } from '@/api'
import router from '@/router'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    permissions: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userInfo: (state) => state.user,
    userRole: (state) => state.user.role || '',
    userName: (state) => state.user.realName || state.user.username || ''
  },

  actions: {
    // 登录
    async login(loginForm) {
      const res = await authApi.login(loginForm)

      this.token = res.data.token
      this.user = res.data.user

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      return res
    },

    // 退出登录
    async logout() {
      try {
        await authApi.logout()
      } catch (error) {
        // 忽略错误
      }

      this.token = ''
      this.user = {}
      this.permissions = []

      localStorage.removeItem('token')
      localStorage.removeItem('user')

      router.push('/login')
    },

    // 获取用户信息
    async getUserInfo() {
      const res = await authApi.getProfile()
      this.user = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
      return res.data
    },

    // 修改密码
    async changePassword(data) {
      return await authApi.changePassword(data)
    },

    // 检查权限
    hasPermission(permission) {
      if (this.user.role === 'admin') return true
      return this.permissions.includes(permission)
    },

    // 检查角色
    hasRole(roles) {
      if (!Array.isArray(roles)) roles = [roles]
      if (this.user.role === 'admin') return true
      return roles.includes(this.user.role)
    }
  }
})
