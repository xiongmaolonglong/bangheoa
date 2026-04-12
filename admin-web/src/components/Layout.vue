<template>
  <div class="layout-container">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <div class="logo-icon">A</div>
        <span class="logo-text">广告工程管理系统</span>
      </div>
      <div class="header-right">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0">
          <el-icon class="icon-btn"><Bell /></el-icon>
        </el-badge>
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="28" class="avatar">
              {{ user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <span class="user-name">{{ user?.name || '用户' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人设置</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Sidebar + Main -->
    <div class="layout-body">
      <aside class="sidebar">
        <div class="menu-group">主菜单</div>
        <router-link to="/dashboard" class="menu-item" active-class="active">
          <el-icon><DataBoard /></el-icon><span>数据看板</span>
        </router-link>
        <router-link to="/work-orders" class="menu-item" active-class="active">
          <el-icon><Tickets /></el-icon><span>工单管理</span>
        </router-link>
        <router-link to="/declarations" class="menu-item" active-class="active">
          <el-icon><Document /></el-icon><span>申报接收</span>
        </router-link>
        <router-link to="/dispatch" class="menu-item" active-class="active">
          <el-icon><Position /></el-icon><span>派单管理</span>
        </router-link>

        <div class="menu-group">业务</div>
        <router-link to="/designs" class="menu-item" active-class="active">
          <el-icon><Picture /></el-icon><span>设计管理</span>
        </router-link>
        <router-link to="/production" class="menu-item" active-class="active">
          <el-icon><Box /></el-icon><span>生产管理</span>
        </router-link>
        <router-link to="/construction" class="menu-item" active-class="active">
          <el-icon><Tools /></el-icon><span>施工管理</span>
        </router-link>

        <div class="menu-group">财务</div>
        <router-link to="/finance" class="menu-item" active-class="active">
          <el-icon><Money /></el-icon><span>费用管理</span>
        </router-link>
        <router-link to="/archive" class="menu-item" active-class="active">
          <el-icon><Folder /></el-icon><span>归档管理</span>
        </router-link>
        <router-link to="/aftersale" class="menu-item" active-class="active">
          <el-icon><Service /></el-icon><span>售后管理</span>
        </router-link>

        <div class="menu-group">系统</div>
        <router-link to="/organization" class="menu-item" active-class="active">
          <el-icon><OfficeBuilding /></el-icon><span>组织架构</span>
        </router-link>
      </aside>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import api from '../api'
import {
  Bell, DataBoard, Tickets, Document, Position,
  Picture, Box, Tools, Money, Folder, Service, OfficeBuilding
} from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()
const user = ref(auth.user)
const unreadCount = ref(0)

onMounted(async () => {
  try {
    const res = await api.get('/notifications/unread-count')
    unreadCount.value = res.data?.count || 0
  } catch { /* 静默失败 */ }
})

function handleCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container { min-height: 100vh; }

.header {
  height: 56px; background: #fff; border-bottom: 1px solid #e8e8e8;
  display: flex; align-items: center; padding: 0 24px;
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon {
  width: 28px; height: 28px; background: #409eff; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px;
}
.logo-text { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.header-right { margin-left: auto; display: flex; align-items: center; gap: 20px; }
.icon-btn { color: #606266; font-size: 18px; cursor: pointer; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
.user-info:hover { background: #f5f7fa; }
.user-name { color: #303133; font-size: 14px; }

.layout-body { display: flex; margin-top: 56px; min-height: calc(100vh - 56px); }

.sidebar {
  width: 220px; background: #001529; color: #fff; padding-top: 8px;
  position: fixed; top: 56px; bottom: 0; left: 0; overflow-y: auto;
}
.menu-group {
  padding: 12px 20px 6px; font-size: 12px;
  color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px;
}
.menu-item {
  display: flex; align-items: center; padding: 0 20px; height: 44px;
  cursor: pointer; color: rgba(255,255,255,0.65); transition: all 0.2s;
  gap: 10px; font-size: 14px; text-decoration: none;
}
.menu-item:hover { color: #fff; background: rgba(255,255,255,0.08); }
.menu-item.active { color: #fff; background: #1890ff; }
.menu-item .el-icon { width: 16px; }

.main-content {
  margin-left: 220px; flex: 1; padding: 24px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
