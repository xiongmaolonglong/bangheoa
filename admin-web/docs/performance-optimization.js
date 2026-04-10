/**
 * 前端性能优化指南
 *
 * 已实施的优化：
 * 1. 代码分割 (Code Splitting)
 * 2. 懒加载 (Lazy Loading)
 * 3. 依赖预构建
 * 4. 压缩配置
 */

// ============================================
// 1. 路由懒加载（已实现）
// ============================================
// router/index.js 中已使用动态 import
// component: () => import('@/views/UserList.vue')

// ============================================
// 2. 组件懒加载
// ============================================

// 方式1: defineAsyncComponent
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
)

// 方式2: 异步组件带加载状态
const AsyncComponent = defineAsyncComponent({
  loader: () => import('@/components/HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})

// ============================================
// 3. 图片懒加载
// ============================================

// 使用 Intersection Observer API
export const lazyLoadImage = {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.src = binding.value
          observer.unobserve(el)
        }
      })
    })
    observer.observe(el)
  }
}

// 使用: v-lazy="imageUrl"

// ============================================
// 4. 虚拟滚动（大数据列表）
// ============================================

// 安装: npm install vue-virtual-scroller

import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// 使用:
// <RecycleScroller
//   :items="largeList"
//   :item-size="50"
//   key-field="id"
// >
//   <template #default="{ item }">
//     <div>{{ item.name }}</div>
//   </template>
// </RecycleScroller>

// ============================================
// 5. 防抖和节流
// ============================================

import { debounce, throttle } from 'lodash-es'

// 搜索输入防抖
const handleSearch = debounce((keyword) => {
  // 执行搜索
}, 300)

// 滚动事件节流
const handleScroll = throttle(() => {
  // 处理滚动
}, 100)

// VueUse 方式
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn((keyword) => {
  // 执行搜索
}, 300)

// ============================================
// 6. 计算属性缓存
// ============================================

import { computed, ref } from 'vue'

// 计算属性自动缓存
const filteredList = computed(() => {
  return list.value.filter(item => item.status === 'active')
})

// 避免在模板中使用复杂表达式
// ❌ <div>{{ list.filter(i => i.active).map(i => i.name).join(', ') }}</div>
// ✅ <div>{{ activeNames }}</div>

// ============================================
// 7. KeepAlive 组件缓存
// ============================================

// 在路由配置中
{
  path: '/orders',
  component: () => import('@/pages/order/index.vue'),
  meta: { keepAlive: true }
}

// 在布局组件中
<router-view v-slot="{ Component }">
  <keep-alive :include="cachedViews">
    <component :is="Component" />
  </keep-alive>
</router-view>

// ============================================
// 8. 请求优化
// ============================================

// 请求取消
const controller = new AbortController()

fetch('/api/data', { signal: controller.signal })

// 取消请求
controller.abort()

// 并发请求
const [users, orders] = await Promise.all([
  userApi.getList(),
  orderApi.getList()
])

// 请求缓存
const cache = new Map()

const fetchWithCache = async (key, fetcher) => {
  if (cache.has(key)) {
    return cache.get(key)
  }
  const data = await fetcher()
  cache.set(key, data)
  return data
}

// ============================================
// 9. 状态管理优化
// ============================================

// Pinia 持久化
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    user: {}
  }),
  persist: {
    paths: ['token', 'user']
  }
})

// ============================================
// 10. 构建分析
// ============================================

// 安装: npm install rollup-plugin-visualizer -D

// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
}

// ============================================
// 性能监控
// ============================================

// 使用 Performance API
const measurePerformance = (name, fn) => {
  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)
  performance.measure(name, `${name}-start`, `${name}-end`)
  return result
}

// 使用 VueUse
import { usePerformanceObserver } from '@vueuse/core'

usePerformanceObserver((entry) => {
  console.log('Performance entry:', entry)
})

export {
  lazyLoadImage,
  handleSearch,
  handleScroll
}