<template>
  <el-popover
    placement="bottom-end"
    :width="380"
    trigger="click"
    @show="handleShow"
  >
    <template #reference>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-button circle>
          <el-icon><Bell /></el-icon>
        </el-button>
      </el-badge>
    </template>

    <div class="notification-panel">
      <!-- 头部 -->
      <div class="notification-header">
        <span class="title">通知中心</span>
        <el-button
          v-if="unreadCount > 0"
          type="primary"
          text
          size="small"
          @click="markAllRead"
        >
          全部已读
        </el-button>
      </div>

      <!-- 通知列表 -->
      <div class="notification-list" v-loading="loading">
        <template v-if="notifications.length > 0">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.is_read }"
            @click="handleItemClick(item)"
          >
            <!-- 图标 -->
            <div class="item-icon" :class="item.type">
              <el-icon v-if="item.type === 'status_change'"><Refresh /></el-icon>
              <el-icon v-else-if="item.type === 'task_assigned'"><Document /></el-icon>
              <el-icon v-else-if="item.type === 'announcement'"><Bell /></el-icon>
              <el-icon v-else><InfoFilled /></el-icon>
            </div>

            <!-- 内容 -->
            <div class="item-content">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-desc">{{ item.content }}</div>
              <div class="item-time">{{ formatTime(item.created_at) }}</div>
            </div>

            <!-- 未读标记 -->
            <div v-if="!item.is_read" class="item-dot"></div>
          </div>
        </template>

        <el-empty v-else description="暂无通知" :image-size="60" />
      </div>

      <!-- 底部 -->
      <div class="notification-footer" v-if="notifications.length > 0">
        <el-button text @click="viewAll">查看全部</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Bell, Refresh, Document, InfoFilled } from '@element-plus/icons-vue'
import { notificationApi } from '@/api'
import { notificationService } from '@/utils/notification'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()
const loading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
let socket = null

// 格式化时间
const formatTime = (time) => {
  const date = dayjs(time)
  const now = dayjs()
  const diff = now.diff(date, 'day')

  if (diff === 0) {
    return date.fromNow()
  } else if (diff < 7) {
    return date.format('dddd HH:mm')
  } else {
    return date.format('MM-DD HH:mm')
  }
}

// 获取通知列表
const fetchNotifications = async () => {
  loading.value = true
  try {
    const res = await notificationApi.getList({ page: 1, limit: 10 })
    notifications.value = res.data.list
  } catch (err) {
    console.error('获取通知失败:', err)
  } finally {
    loading.value = false
  }
}

// 获取未读数量
const fetchUnreadCount = async () => {
  try {
    const res = await notificationApi.getUnreadCount()
    unreadCount.value = res.data.count
  } catch (err) {
    console.error('获取未读数量失败:', err)
  }
}

// 标记全部已读
const markAllRead = async () => {
  try {
    await notificationApi.markAllRead()
    unreadCount.value = 0
    notifications.value.forEach(item => {
      item.is_read = true
    })
    ElMessage.success('已全部标记为已读')
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

// 点击通知项
const handleItemClick = async (item) => {
  // 标记已读
  if (!item.is_read) {
    try {
      await notificationApi.markRead([item.id])
      item.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (err) {
      console.error('标记已读失败:', err)
    }
  }

  // 跳转到相关订单
  if (item.order_id) {
    router.push(`/orders/${item.order_id}`)
  }
}

// 查看全部
const viewAll = () => {
  router.push('/notifications')
}

// 显示时加载数据
const handleShow = () => {
  fetchNotifications()
}

// 初始化 WebSocket 连接
const initWebSocket = () => {
  const token = localStorage.getItem('token')
  if (!token) return

  const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.hostname}:3000`

  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    console.log('WebSocket 已连接')
    // 发送认证
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.id) {
      socket.send(JSON.stringify({ type: 'authenticate', userId: user.id }))
    }
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      if (data.type === 'notification') {
        // 新通知
        notifications.value.unshift(data)
        unreadCount.value++

        // 显示消息提示
        ElMessage({
          type: 'info',
          message: data.title,
          duration: 3000
        })

        // 发送浏览器推送通知
        notificationService.send(data.title, {
          body: data.content,
          tag: `notification-${data.id}`,
          onClick: () => {
            if (data.order_id) {
              router.push(`/orders/${data.order_id}`)
            }
          }
        })
      } else if (data.type === 'unread_count') {
        unreadCount.value = data.count
      }
    } catch (err) {
      console.error('解析消息失败:', err)
    }
  }

  socket.onerror = (err) => {
    console.error('WebSocket 错误:', err)
  }

  socket.onclose = () => {
    console.log('WebSocket 已断开')
    // 重连
    setTimeout(() => {
      initWebSocket()
    }, 5000)
  }
}

onMounted(() => {
  fetchUnreadCount()
  fetchNotifications()
  // initWebSocket() // 需要 WebSocket 服务器
})

onUnmounted(() => {
  if (socket) {
    socket.close()
  }
})
</script>

<style scoped>
.notification-panel {
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-header .title {
  font-size: 16px;
  font-weight: 600;
}

.notification-list {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: var(--el-fill-color-light);
}

.notification-item.unread {
  background: var(--el-color-primary-light-9);
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon.status_change {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.item-icon.task_assigned {
  background: var(--el-color-success-light-8);
  color: var(--el-color-success);
}

.item-icon.announcement {
  background: var(--el-color-warning-light-8);
  color: var(--el-color-warning);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.item-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.notification-footer {
  padding: 12px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>