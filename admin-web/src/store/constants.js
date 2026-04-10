import { defineStore } from 'pinia'
import { configApi } from '@/api'

// 本地缓存 key
const CACHE_KEY = 'system_constants'
const CACHE_EXPIRE_KEY = 'system_constants_expire'
const CACHE_TTL = 60 * 60 * 1000 // 1小时缓存

export const useConstantsStore = defineStore('constants', {
  state: () => ({
    // 订单状态
    orderStatus: {},
    orderStatusConfig: {},
    statusFlow: {},

    // 用户角色
    userRoles: {},
    userRolesConfig: {},

    // 生产状态
    productionStatus: {},
    productionStatusConfig: {},

    // 生产类型
    productionType: {},
    productionTypeConfig: {},

    // 订单来源
    orderSource: {},
    orderSourceConfig: {},

    // 审核类型
    reviewTypes: {},

    // 字段类型
    fieldTypes: {},
    fieldTypesConfig: {},

    // 是否已加载
    loaded: false
  }),

  getters: {
    // 获取状态标签
    getStatusLabel: (state) => (status) => {
      return state.orderStatusConfig[status]?.label || status
    },

    // 获取状态颜色
    getStatusColor: (state) => (status) => {
      return state.orderStatusConfig[status]?.color || ''
    },

    // 获取角色标签
    getRoleLabel: (state) => (role) => {
      return state.userRolesConfig[role]?.label || role
    },

    // 状态选项列表
    statusOptions: (state) => {
      return Object.entries(state.orderStatusConfig).map(([value, config]) => ({
        value,
        label: config.label
      }))
    },

    // 角色选项列表
    roleOptions: (state) => {
      return Object.entries(state.userRolesConfig).map(([value, config]) => ({
        value,
        label: config.label
      }))
    },

    // 订单来源选项
    sourceOptions: (state) => {
      return Object.entries(state.orderSourceConfig).map(([value, config]) => ({
        value,
        label: config.label
      }))
    }
  },

  actions: {
    /**
     * 从本地缓存加载
     */
    loadFromCache() {
      const cached = localStorage.getItem(CACHE_KEY)
      const expire = localStorage.getItem(CACHE_EXPIRE_KEY)

      if (cached && expire && Date.now() < parseInt(expire)) {
        const data = JSON.parse(cached)
        this.setData(data)
        return true
      }
      return false
    },

    /**
     * 保存到本地缓存
     */
    saveToCache() {
      const data = {
        orderStatus: this.orderStatus,
        orderStatusConfig: this.orderStatusConfig,
        statusFlow: this.statusFlow,
        userRoles: this.userRoles,
        userRolesConfig: this.userRolesConfig,
        productionStatus: this.productionStatus,
        productionStatusConfig: this.productionStatusConfig,
        productionType: this.productionType,
        productionTypeConfig: this.productionTypeConfig,
        orderSource: this.orderSource,
        orderSourceConfig: this.orderSourceConfig,
        reviewTypes: this.reviewTypes,
        fieldTypes: this.fieldTypes,
        fieldTypesConfig: this.fieldTypesConfig
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(CACHE_EXPIRE_KEY, String(Date.now() + CACHE_TTL))
    },

    /**
     * 设置数据
     */
    setData(data) {
      this.orderStatus = data.orderStatus || {}
      this.orderStatusConfig = data.orderStatusConfig || {}
      this.statusFlow = data.statusFlow || {}
      this.userRoles = data.userRoles || {}
      this.userRolesConfig = data.userRolesConfig || {}
      this.productionStatus = data.productionStatus || {}
      this.productionStatusConfig = data.productionStatusConfig || {}
      this.productionType = data.productionType || {}
      this.productionTypeConfig = data.productionTypeConfig || {}
      this.orderSource = data.orderSource || {}
      this.orderSourceConfig = data.orderSourceConfig || {}
      this.reviewTypes = data.reviewTypes || {}
      this.fieldTypes = data.fieldTypes || {}
      this.fieldTypesConfig = data.fieldTypesConfig || {}
      this.loaded = true
    },

    /**
     * 从服务器加载
     */
    async load(force = false) {
      // 先尝试从缓存加载
      if (!force && this.loadFromCache()) {
        return
      }

      try {
        const res = await configApi.getConstants()
        if (res.data) {
          this.setData(res.data)
          this.saveToCache()
        }
      } catch (error) {
        console.error('加载常量配置失败:', error)
      }
    },

    /**
     * 清除缓存
     */
    clearCache() {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_EXPIRE_KEY)
      this.loaded = false
    }
  }
})