import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: () => import('../components/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据看板' }
      },
      {
        path: 'work-orders',
        name: 'WorkOrders',
        component: () => import('../views/WorkOrders.vue'),
        meta: { title: '工单管理' }
      },
      {
        path: 'work-orders/:id',
        name: 'WorkOrderDetail',
        component: () => import('../views/WorkOrderDetail.vue'),
        meta: { title: '工单详情' }
      },
      {
        path: 'work-orders/:id/measure-review',
        name: 'MeasureReview',
        component: () => import('../views/MeasureReview.vue'),
        meta: { title: '测量数据审核' }
      },
      {
        path: 'declarations',
        name: 'Declarations',
        component: () => import('../views/Declarations.vue'),
        meta: { title: '申报接收' }
      },
      {
        path: 'dispatch',
        name: 'Dispatch',
        component: () => import('../views/Dispatch.vue'),
        meta: { title: '派单管理' }
      },
      {
        path: 'designs',
        name: 'Designs',
        component: () => import('../views/Designs.vue'),
        meta: { title: '设计管理' }
      },
      {
        path: 'production',
        name: 'Production',
        component: () => import('../views/Production.vue'),
        meta: { title: '生产管理' }
      },
      {
        path: 'construction',
        name: 'Construction',
        component: () => import('../views/Construction.vue'),
        meta: { title: '施工管理' }
      },
      {
        path: 'construction/:workOrderId',
        name: 'ConstructionDetail',
        component: () => import('../views/ConstructionDetail.vue'),
        meta: { title: '施工详情' }
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('../views/Finance.vue'),
        meta: { title: '费用管理' }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: () => import('../views/Archive.vue'),
        meta: { title: '归档管理' }
      },
      {
        path: 'aftersale',
        name: 'Aftersale',
        component: () => import('../views/Aftersale.vue'),
        meta: { title: '售后管理' }
      },
      {
        path: 'organization',
        name: 'Organization',
        component: () => import('../views/Organization.vue'),
        meta: { title: '组织架构' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统配置' }
      },
      {
        path: 'clients',
        name: 'Clients',
        component: () => import('../views/Clients.vue'),
        meta: { title: '甲方管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
