<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { notificationService } from '@/utils/notification'

onMounted(async () => {
  const userStore = useUserStore()

  // 已登录用户自动请求通知权限
  if (userStore.isLoggedIn) {
    const granted = await notificationService.requestPermission()
    if (granted) {
      console.log('通知权限已授权')
    }
  }
})
</script>
