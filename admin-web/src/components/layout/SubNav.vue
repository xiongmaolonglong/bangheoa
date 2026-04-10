<template>
  <aside class="sub-nav">
    <div class="sub-nav-header">
      <span class="module-title">{{ moduleTitle }}</span>
    </div>
    <el-menu
      :default-active="activePath"
      router
      class="sub-menu"
    >
      <el-menu-item
        v-for="item in subItems"
        :key="item.path"
        :index="item.path"
      >
        {{ item.title }}
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  currentGroup: { type: String, default: '' }
})

const route = useRoute()
const activePath = computed(() => route.path)

const moduleTitle = computed(() => {
  const map = {
    '/orders': '订单',
    '/design': '设计',
    '/production': '生产',
    '/install': '安装',
    '/statistics': '统计',
    '/customers': '客户',
    '/map': '地图',
    '/settings': '设置'
  }
  return map[props.currentGroup] || ''
})

const subItems = computed(() => {
  const items = {
    '/orders': [
      { path: '/orders', title: '全部订单' },
      { path: '/review', title: '待审核' },
      { path: '/archive', title: '归档管理' }
    ],
    '/design': [
      { path: '/design', title: '设计任务' }
    ],
    '/production': [
      { path: '/production', title: '生产任务' }
    ],
    '/install': [
      { path: '/install', title: '安装任务' }
    ],
    '/statistics': [
      { path: '/statistics', title: '统计报表' }
    ],
    '/customers': [
      { path: '/customers', title: '客户列表' }
    ],
    '/map': [
      { path: '/map', title: '订单地图' }
    ],
    '/settings': [
      { path: '/settings/users', title: '用户管理' },
      { path: '/settings/regions', title: '地区组织' },
      { path: '/settings/form-fields', title: '表单字段配置' },
      { path: '/settings/ad-types', title: '广告类型配置' },
      { path: '/settings/system', title: '系统配置' },
      { path: '/settings/dispatch', title: '派单规则' },
      { path: '/settings/auto-review', title: '自动审核' }
    ]
  }
  return items[props.currentGroup] || []
})
</script>

<style scoped>
.sub-nav {
  width: 180px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sub-nav-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
}

.module-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sub-menu {
  flex: 1;
  border: none;
  background: transparent;
}

.sub-menu :deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  margin: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
}

.sub-menu :deep(.el-menu-item:hover) {
  background-color: #e6f7ff;
  color: #1890ff;
}

.sub-menu :deep(.el-menu-item.is-active) {
  background-color: #e6f7ff;
  color: #1890ff;
}
</style>
