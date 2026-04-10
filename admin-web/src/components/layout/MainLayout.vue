<template>
  <div class="layout-container">
    <TopNav
      :is-dark="isDark"
      :notification-count="notificationCount"
      :user-name="userStore.userName"
      @navigate="handleNavigate"
      @command="handleCommand"
      @toggle-theme="toggleTheme"
      @notification="handleNotification"
    />

    <div class="layout-body">
      <SubNav v-if="currentGroup !== '/dashboard'" :current-group="currentGroup" />

      <div class="layout-right">
        <TabBar />
        <main class="layout-content">
          <router-view v-slot="{ Component }">
            <transition name="slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useTabsStore } from '@/store/tabs'
import { ElMessageBox } from 'element-plus'
import TopNav from './TopNav.vue'
import SubNav from './SubNav.vue'
import TabBar from './TabBar.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const isDark = ref(false)
const notificationCount = ref(0)

const currentGroup = computed(() => {
  const path = route.path
  const groups = ['/orders', '/review', '/design', '/production', '/install', '/archive', '/statistics', '/customers', '/settings']
  const match = groups.find(g => path.startsWith(g)) || '/dashboard'
  return match === '/review' ? '/orders' : match === '/archive' ? '/orders' : match
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const handleNavigate = (path) => router.push(path)

const handleCommand = (command) => {
  if (command === 'profile') router.push('/settings/users')
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      .then(() => userStore.logout())
      .catch(() => {})
  }
}

const handleNotification = () => {}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
  background: #f0f2f5;
}

.slide-enter-active,
.slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from { opacity: 0; transform: translateX(10px); }
.slide-leave-to { opacity: 0; transform: translateX(-10px); }
</style>
