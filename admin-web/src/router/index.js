import { createRouter, createWebHistory } from 'vue-router'
import { authApi } from '@/api'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/index.vue'),
        meta: { title: '首页', hidden: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/pages/order/index.vue'),
        meta: { title: '全部订单', navGroup: '/orders' }
      },
      {
        path: 'orders/create',
        name: 'OrderCreate',
        component: () => import('@/pages/order/create.vue'),
        meta: { title: '新建订单', hidden: true }
      },
      {
        path: 'orders/:id(\\d+)',
        name: 'OrderDetail',
        component: () => import('@/pages/order/detail.vue'),
        meta: { title: '订单详情', hidden: true }
      },
      {
        path: 'orders/:id(\\d+)/edit',
        name: 'OrderEdit',
        component: () => import('@/pages/order/edit.vue'),
        meta: { title: '编辑订单', hidden: true }
      },
      {
        path: 'review',
        name: 'Review',
        component: () => import('@/pages/review/index.vue'),
        meta: { title: '待审核', navGroup: '/orders', roles: ['admin'] }
      },
      {
        path: 'review/:id(\\d+)',
        name: 'ReviewDetail',
        component: () => import('@/pages/review/detail.vue'),
        meta: { title: '审核详情', hidden: true }
      },
      {
        path: 'design',
        name: 'Design',
        component: () => import('@/pages/design/index.vue'),
        meta: { title: '设计任务', navGroup: '/design', roles: ['admin', 'designer'] }
      },
      {
        path: 'design/:id(\\d+)',
        name: 'DesignScheme',
        component: () => import('@/pages/design/scheme.vue'),
        meta: { title: '设计方案', hidden: true }
      },
      {
        path: 'production',
        name: 'Production',
        component: () => import('@/pages/production/index.vue'),
        meta: { title: '生产任务', navGroup: '/production', roles: ['admin', 'producer'] }
      },
      {
        path: 'production/:id(\\d+)',
        name: 'ProductionDetail',
        component: () => import('@/pages/production/detail.vue'),
        meta: { title: '生产详情', hidden: true }
      },
      {
        path: 'install',
        name: 'Install',
        component: () => import('@/pages/install/index.vue'),
        meta: { title: '安装任务', navGroup: '/install', roles: ['admin', 'field_worker'] }
      },
      {
        path: 'install/:id(\\d+)',
        name: 'InstallDetail',
        component: () => import('@/pages/install/detail.vue'),
        meta: { title: '安装详情', hidden: true }
      },
      {
        path: 'install/:id(\\d+)/report',
        name: 'InstallReport',
        component: () => import('@/pages/install/report.vue'),
        meta: { title: '安装报告', hidden: true }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: () => import('@/pages/archive/index.vue'),
        meta: { title: '归档管理', navGroup: '/orders' }
      },
      {
        path: 'archive/:id(\\d+)',
        name: 'ArchiveDetail',
        component: () => import('@/pages/archive/detail.vue'),
        meta: { title: '归档详情', hidden: true }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/pages/statistics/index.vue'),
        meta: { title: '统计报表', navGroup: '/statistics', roles: ['admin'] }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/pages/customer/index.vue'),
        meta: { title: '客户列表', navGroup: '/customers' }
      },
      {
        path: 'customers/:id(\\d+)',
        name: 'CustomerDetail',
        component: () => import('@/pages/customer/detail.vue'),
        meta: { title: '客户详情', hidden: true }
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/pages/map/index.vue'),
        meta: { title: '订单地图', navGroup: '/map' }
      },
      {
        path: 'settings',
        name: 'Settings',
        redirect: '/settings/users',
        meta: { navGroup: '/settings' }
      },
      {
        path: 'settings/users',
        name: 'UserManage',
        component: () => import('@/pages/settings/users.vue'),
        meta: { title: '用户管理', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/regions',
        name: 'RegionManage',
        component: () => import('@/pages/settings/regions.vue'),
        meta: { title: '地区组织', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/form-fields',
        name: 'FormFieldsConfig',
        component: () => import('@/pages/settings/form-fields.vue'),
        meta: { title: '表单字段配置', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/ad-types',
        name: 'AdTypesConfig',
        component: () => import('@/pages/settings/ad-types.vue'),
        meta: { title: '广告类型配置', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/system',
        name: 'SystemConfig',
        component: () => import('@/pages/settings/system.vue'),
        meta: { title: '系统配置', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/dispatch',
        name: 'DispatchRules',
        component: () => import('@/pages/settings/dispatch.vue'),
        meta: { title: '派单规则', navGroup: '/settings', roles: ['admin'] }
      },
      {
        path: 'settings/auto-review',
        name: 'AutoReviewConfig',
        component: () => import('@/pages/settings/auto-review.vue'),
        meta: { title: '自动审核', navGroup: '/settings', roles: ['admin'] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/error/404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let profileFetching = false

router.beforeEach(async (to) => {
  document.title = to.meta.title ? `${to.meta.title} - 户外广告派单系统` : '户外广告派单系统'

  const token = localStorage.getItem('token')
  const requiresAuth = to.meta.requiresAuth !== false

  if (!requiresAuth) return
  if (!token) return { path: '/login', query: { redirect: to.fullPath } }

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!user.id && !profileFetching) {
    profileFetching = true
    try {
      const res = await authApi.getProfile()
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return { path: '/login', query: { redirect: to.fullPath } }
    } finally {
      profileFetching = false
    }
  }
})

export default router
