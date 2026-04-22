<template>
  <nav class="top-nav">
    <div class="top-nav-logo" @click="navigateTo('/dashboard')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
      <span>派单系统</span>
    </div>

    <div class="top-nav-menu">
      <div
        v-for="nav in navGroups"
        :key="nav.path"
        class="top-nav-item"
        :class="{ active: currentGroup === nav.path }"
        @click="navigateTo(nav.path)"
      >
        <el-icon v-if="nav.icon"><component :is="nav.icon" /></el-icon>
        <span>{{ nav.title }}</span>
      </div>
    </div>

    <div class="top-nav-right">
      <button class="header-icon-btn" @click="emit('toggle-theme')">
        <el-icon><component :is="isDark ? 'Sunny' : 'Moon'" /></el-icon>
      </button>
      <button class="header-icon-btn" @click="emit('notification')">
        <el-badge :value="notificationCount" :hidden="!notificationCount" :max="99">
          <el-icon><Bell /></el-icon>
        </el-badge>
      </button>
      <el-dropdown @command="emit('command', $event)">
        <div class="user-dropdown">
          <el-avatar :size="28" class="user-avatar">{{ userName?.charAt(0) }}</el-avatar>
          <span class="user-name">{{ userName }}</span>
          <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile"><el-icon><User /></el-icon>个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  Sunny, Moon, Bell, User, SwitchButton, ArrowDown
} from '@element-plus/icons-vue'

defineProps({
  isDark: { type: Boolean, default: false },
  notificationCount: { type: Number, default: 0 },
  userName: { type: String, default: '' }
})

const emit = defineEmits(['navigate', 'command', 'toggle-theme', 'notification'])

const route = useRoute()
const userStore = useUserStore()

const navGroups = computed(() => {
  const all = [
    { path: '/orders', title: '订单', icon: 'Document' },
    { path: '/design', title: '设计', icon: 'Edit', roles: ['admin', 'designer'] },
    { path: '/production', title: '生产', icon: 'Setting', roles: ['admin', 'producer'] },
    { path: '/install', title: '安装', icon: 'Position', roles: ['admin', 'field_worker'] },
    { path: '/statistics', title: '统计', icon: 'DataAnalysis', roles: ['admin'] },
    { path: '/customers', title: '客户', icon: 'User' },
    { path: '/map', title: '地图', icon: 'Location' },
    { path: '/settings', title: '设置', icon: 'Tools', roles: ['admin'] }
  ]
  return all.filter(n => !n.roles || userStore.hasRole(n.roles))
})

const currentGroup = computed(() => {
  const path = route.path
  return navGroups.value.find(n => path.startsWith(n.path))?.path || '/dashboard'
})

const navigateTo = (path) => {
  emit('navigate', path)
}
</script>

<style scoped>
.top-nav {
  height: 50px;
  display: flex;
  align-items: center;
  background: #001529;
  color: rgba(255, 255, 255, 0.85);
  padding: 0 16px;
  gap: 8px;
  flex-shrink: 0;
}

.top-nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 0 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  color: #fff;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  margin-right: 8px;
  white-space: nowrap;
}

.top-nav-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
}

.top-nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.65);
}

.top-nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.top-nav-item.active {
  background: #1890ff;
  color: #fff;
}

.top-nav-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.header-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.2s;
  font-size: 16px;
}

.header-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-dropdown:hover {
  background: rgba(255, 255, 255, 0.08);
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
}

.user-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.dropdown-arrow {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}
</style>
