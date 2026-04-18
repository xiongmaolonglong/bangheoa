<template>
  <div class="layout-container">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <span class="logo-text">广告工程管理</span>
      </div>
      <div class="header-right">
        <el-badge :value="notif.unreadCount" :hidden="notif.unreadCount === 0" class="header-badge">
          <el-icon class="icon-btn" @click="router.push('/notifications')"><Bell /></el-icon>
        </el-badge>
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="32" class="avatar">
              {{ user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <span class="user-name">{{ user?.name || '用户' }}</span>
            <el-icon class="arrow-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人设置
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Sidebar + Main -->
    <div class="layout-body">
      <aside class="sidebar">
        <div class="menu-section">
          <div class="menu-section-title">主菜单</div>
          <router-link to="/dashboard" class="menu-item" active-class="active">
            <el-icon><DataBoard /></el-icon><span>数据看板</span>
          </router-link>
          <router-link to="/work-orders" class="menu-item" active-class="active">
            <el-icon><Tickets /></el-icon><span>工单管理</span>
          </router-link>
          <router-link to="/declarations" class="menu-item" active-class="active">
            <el-icon><Document /></el-icon><span>申报接收</span>
            <el-badge v-if="notif.declarationsCount" :value="notif.declarationsCount" class="menu-badge" />
          </router-link>
          <router-link to="/dispatch" class="menu-item" active-class="active">
            <el-icon><Position /></el-icon><span>派单管理</span>
            <el-badge v-if="notif.dispatchCount" :value="notif.dispatchCount" class="menu-badge" />
          </router-link>
          <router-link to="/audit" class="menu-item" active-class="active">
            <el-icon><DocumentChecked /></el-icon><span>审核中心</span>
            <el-badge v-if="notif.auditCount" :value="notif.auditCount" class="menu-badge" />
          </router-link>
        </div>

        <div class="menu-section">
          <div class="menu-section-title">业务</div>
          <router-link to="/designs" class="menu-item" active-class="active">
            <el-icon><Picture /></el-icon><span>设计管理</span>
          </router-link>
          <router-link to="/production" class="menu-item" active-class="active">
            <el-icon><Box /></el-icon><span>生产管理</span>
          </router-link>
          <router-link to="/construction" class="menu-item" active-class="active">
            <el-icon><Tools /></el-icon><span>施工管理</span>
          </router-link>
        </div>

        <div class="menu-section">
          <div class="menu-section-title">财务</div>
          <router-link to="/finance" class="menu-item" active-class="active">
            <el-icon><Money /></el-icon><span>费用管理</span>
          </router-link>
          <router-link to="/archive" class="menu-item" active-class="active">
            <el-icon><Folder /></el-icon><span>归档管理</span>
          </router-link>
          <router-link to="/aftersale" class="menu-item" active-class="active">
            <el-icon><Service /></el-icon><span>售后管理</span>
          </router-link>
        </div>

        <div class="menu-section">
          <div class="menu-section-title">系统</div>
          <router-link to="/clients" class="menu-item" active-class="active">
            <el-icon><Avatar /></el-icon><span>甲方管理</span>
          </router-link>
          <router-link to="/organization" class="menu-item" active-class="active">
            <el-icon><OfficeBuilding /></el-icon><span>组织架构</span>
          </router-link>
          <router-link to="/settings" class="menu-item" active-class="active">
            <el-icon><Setting /></el-icon><span>系统配置</span>
          </router-link>
          <router-link to="/notifications" class="menu-item" active-class="active">
            <el-icon><Bell /></el-icon><span>消息通知</span>
            <el-badge v-if="notif.unreadCount" :value="notif.unreadCount" class="menu-badge" />
          </router-link>
          <router-link to="/audit-logs" class="menu-item" active-class="active">
            <el-icon><Monitor /></el-icon><span>操作日志</span>
          </router-link>
        </div>
      </aside>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useNotificationStore } from '../store/notification'
import {
  Bell, DataBoard, Tickets, Document, Position, DocumentChecked,
  Picture, Box, Tools, Money, Folder, Service, OfficeBuilding, Setting, Avatar,
  ArrowDown, User, SwitchButton, Monitor
} from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()
const notif = useNotificationStore()

const user = ref(auth.user)

// 初始化
notif.fetchAll()
notif.startPolling()

onUnmounted(() => notif.stopPolling())

function handleCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container { min-height: 100vh; }

/* === Header === */
.header {
  height: var(--header-height, 60px);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: var(--shadow-xs);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.logo-text {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.header-badge {
  cursor: pointer;
}

.icon-btn {
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.icon-btn:hover {
  color: var(--color-text-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-base);
  transition: background var(--transition-fast);
}

.user-info:hover {
  background: var(--color-bg-page);
}

.user-name {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.arrow-icon {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

/* === Layout Body === */
.layout-body {
  display: flex;
  margin-top: var(--header-height, 60px);
  min-height: calc(100vh - var(--header-height, 60px));
}

/* === Sidebar === */
.sidebar {
  width: var(--sidebar-width, 240px);
  background: var(--color-bg-sidebar);
  padding-top: var(--space-3);
  position: fixed;
  top: var(--header-height, 60px);
  bottom: 0;
  left: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar::-webkit-scrollbar {
  width: 4px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.menu-section {
  margin-bottom: var(--space-2);
}

.menu-section-title {
  padding: var(--space-3) var(--space-5) var(--space-2);
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-weight-semibold);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  height: 42px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: all var(--transition-fast);
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  text-decoration: none;
  position: relative;
  margin: 1px var(--space-2);
  border-radius: var(--radius-sm);
}

.menu-item:hover {
  color: rgba(255, 255, 255, 0.95);
  background: var(--color-bg-sidebar-hover);
}

.menu-item.active {
  color: #fff;
  background: var(--color-bg-sidebar-active);
  font-weight: var(--font-weight-medium);
}

.menu-item .el-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-badge {
  margin-left: auto;
}

.menu-badge :deep(.el-badge__content) {
  background: var(--color-danger);
  border: none;
  font-size: 10px;
  height: 16px;
  min-width: 16px;
  line-height: 16px;
}

/* === Main Content === */
.main-content {
  margin-left: var(--sidebar-width, 240px);
  flex: 1;
  padding: var(--space-6);
  min-width: 0;
}

/* === Page Transition === */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
}

/* === Dropdown icons === */
.el-dropdown-menu__item .el-icon {
  margin-right: var(--space-2);
  font-size: 14px;
}
</style>
