<template>
  <div class="dashboard" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 全屏切换按钮 -->
    <div class="fullscreen-toggle" @click="toggleFullscreen">
      <el-icon><FullScreen v-if="!isFullscreen" /><Close v-else /></el-icon>
      <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
    </div>

    <!-- 预警提醒 -->
    <div class="alerts-bar" v-if="alerts.length > 0">
      <div
        v-for="alert in alerts"
        :key="alert.type + alert.title"
        class="alert-item"
        :class="alert.level"
        @click="handleAlertClick(alert)"
      >
        <el-icon class="alert-icon">
          <WarningFilled v-if="alert.level === 'danger'" />
          <Warning v-else-if="alert.level === 'warning'" />
          <Bell v-else />
        </el-icon>
        <span class="alert-title">{{ alert.title }}</span>
        <span class="alert-count" v-if="alert.count">{{ alert.count }}</span>
        <span class="alert-message" v-if="alert.message">{{ alert.message }}</span>
      </div>
    </div>

    <!-- 项目流水线 -->
    <div class="pipeline-panel" v-loading="pipelineLoading">
      <div class="panel-header">
        <h3>项目流水线</h3>
        <span class="pipeline-total">{{ pipelineTotal }} 单进行中</span>
      </div>
      <div class="pipeline-flow">
        <div
          v-for="(stage, index) in pipeline"
          :key="stage.key"
          class="pipeline-stage"
          :class="{ 'has-orders': stage.count > 0, 'is-active': stage.count > 0 }"
          @click="handlePipelineClick(stage)"
        >
          <div class="stage-card">
            <div class="stage-dot"></div>
            <span class="stage-label">{{ stage.label }}</span>
            <span class="stage-count">{{ stage.count }}</span>
            <span class="stage-handlers" v-if="stage.activeCount > 0">{{ stage.activeCount }}人</span>
          </div>
          <div v-if="index < pipeline.length - 1" class="stage-arrow">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions">
      <div class="action-item" @click="$router.push('/order/create')">
        <div class="action-icon create"><el-icon><Plus /></el-icon></div>
        <span>创建订单</span>
      </div>
      <div class="action-item" @click="$router.push('/review')">
        <div class="action-icon review"><el-icon><Checked /></el-icon></div>
        <span>审核中心</span>
      </div>
      <div class="action-item" @click="$router.push('/design')">
        <div class="action-icon design"><el-icon><Edit /></el-icon></div>
        <span>设计任务</span>
      </div>
      <div class="action-item" @click="$router.push('/production')">
        <div class="action-icon produce"><el-icon><Box /></el-icon></div>
        <span>生产管理</span>
      </div>
      <div class="action-item" @click="$router.push('/install')">
        <div class="action-icon install"><el-icon><Position /></el-icon></div>
        <span>安装任务</span>
      </div>
      <div class="action-item" @click="$router.push('/statistics')">
        <div class="action-icon stats"><el-icon><DataLine /></el-icon></div>
        <span>数据统计</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div
        v-for="item in statsCards"
        :key="item.key"
        class="stat-card"
        :class="item.key"
        @click="handleStatClick(item.key)"
      >
        <div class="stat-body">
          <div class="stat-info">
            <span class="stat-value">{{ item.value }}</span>
            <span class="stat-label">{{ item.label }}</span>
          </div>
          <div class="stat-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
        </div>
        <div class="stat-trend" v-if="item.trend">
          <el-icon :class="item.trend > 0 ? 'up' : 'down'">
            <component :is="item.trend > 0 ? 'CaretTop' : 'CaretBottom'" />
          </el-icon>
          <span>{{ Math.abs(item.trend) }}%</span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：通知+待办合并面板 -->
      <div class="left-column">
        <div class="combined-panel">
          <div class="panel-tabs">
            <div
              class="tab-item"
              :class="{ active: activeTab === 'tasks' }"
              @click="activeTab = 'tasks'"
            >
              我的待办
              <el-badge :value="myTasks.length" :hidden="myTasks.length === 0" class="tab-badge" />
            </div>
            <div
              class="tab-item"
              :class="{ active: activeTab === 'notifications' }"
              @click="activeTab = 'notifications'"
            >
              通知中心
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="tab-badge" />
            </div>
          </div>

          <!-- 待办内容 -->
          <div class="tab-content" v-show="activeTab === 'tasks'" v-loading="tasksLoading">
            <div
              v-for="task in myTasks"
              :key="task.id"
              class="task-item"
              @click="goToTask(task)"
            >
              <div class="task-status" :class="task.status"></div>
              <div class="task-info">
                <div class="task-title">{{ task.order_no }}</div>
                <div class="task-meta">
                  <span>{{ task.customer_name || '未填写客户' }}</span>
                  <span>{{ getStatusText(task.status) }}</span>
                </div>
              </div>
              <div class="task-time">
                <span v-if="task.expected_date && isOverdue(task.expected_date)" class="overdue">
                  逾期{{ getOverdueDays(task.expected_date) }}天
                </span>
                <span v-else>{{ formatTime(task.created_at) }}</span>
              </div>
              <el-icon class="task-arrow"><ArrowRight /></el-icon>
            </div>
            <el-empty v-if="myTasks.length === 0 && !tasksLoading" description="暂无待办任务" :image-size="60" />
          </div>

          <!-- 通知内容 -->
          <div class="tab-content" v-show="activeTab === 'notifications'" v-loading="notifLoading">
            <div class="notif-header">
              <el-button text type="primary" size="small" @click="markAllRead" v-if="unreadCount > 0">
                全部已读
              </el-button>
            </div>
            <div
              v-for="notif in notifications"
              :key="notif.id"
              class="notif-item"
              :class="{ unread: notif.is_read === 0 }"
              @click="handleNotifClick(notif)"
            >
              <div class="notif-dot" :class="notif.is_read === 0 ? 'unread' : 'read'"></div>
              <div class="notif-info">
                <div class="notif-title">{{ notif.title }}</div>
                <div class="notif-content">{{ notif.content }}</div>
              </div>
              <div class="notif-time">{{ formatTime(notif.created_at) }}</div>
            </div>
            <el-empty v-if="notifications.length === 0 && !notifLoading" description="暂无通知" :image-size="60" />
          </div>
        </div>

        <!-- 效率指标 -->
        <div class="efficiency-panel" v-if="efficiency.stageDurations?.length">
          <div class="panel-header">
            <h3>效率指标</h3>
            <div class="efficiency-summary">
              <span class="summary-item">
                <strong>{{ efficiency.todayCompleted }}</strong> 今日完成
              </span>
              <span class="summary-item">
                <strong>{{ efficiency.weekCompleted }}</strong> 本周完成
              </span>
            </div>
          </div>
          <div class="efficiency-bars">
            <div
              v-for="stage in efficiency.stageDurations"
              :key="stage.stage"
              class="efficiency-item"
            >
              <span class="stage-name">{{ stage.stage }}</span>
              <div class="stage-bar">
                <div
                  class="stage-progress"
                  :style="{ width: Math.min(stage.avgHours / 72 * 100, 100) + '%' }"
                  :class="getEfficiencyClass(stage.avgHours)"
                ></div>
              </div>
              <span class="stage-hours">{{ formatDuration(stage.avgHours) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：团队活跃 -->
      <div class="right-column">
        <div class="team-panel" v-loading="teamLoading">
          <div class="panel-header">
            <h3>团队活跃</h3>
            <span class="team-count">{{ teamMembers.length }} 人在线</span>
          </div>
          <div class="team-list">
            <div
              v-for="member in teamMembers"
              :key="member.id"
              class="team-member"
            >
              <div class="member-avatar">
                <div class="avatar-circle">
                  {{ member.real_name?.charAt(0) || '?' }}
                </div>
              </div>
              <div class="member-info">
                <div class="member-name">{{ member.real_name }}</div>
                <div class="member-role">{{ getRoleText(member.role) }}</div>
              </div>
              <div class="member-stats">
                <div class="stat-number">{{ member.orderCount }}</div>
                <div class="stat-label">进行中</div>
              </div>
              <div class="member-area">
                <span v-if="member.totalArea > 0" class="area-text">{{ member.totalArea.toFixed(1) }}m²</span>
                <div class="member-statuses">
                  <span
                    v-for="(count, status) in member.statuses"
                    :key="status"
                    class="status-tag"
                    :title="getStatusText(status)"
                  >{{ count }}</span>
                </div>
              </div>
            </div>
            <el-empty v-if="teamMembers.length === 0 && !teamLoading" description="暂无活跃成员" :image-size="60" />
          </div>
        </div>

        <!-- 状态分布图 -->
        <div class="chart-card">
          <div class="panel-header">
            <h3>状态分布</h3>
          </div>
          <div ref="pieChartRef" class="chart-container"></div>
        </div>
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="bottom-section">
      <!-- 区域分布 -->
      <div class="region-panel">
        <div class="panel-header">
          <h3>区域分布</h3>
        </div>
        <div class="region-list">
          <div
            v-for="region in regionStats.slice(0, 8)"
            :key="region.group_id"
            class="region-item"
          >
            <div class="region-name">
              {{ region.province_name }} · {{ region.district_name }} · {{ region.group_name }}
            </div>
            <div class="region-bar">
              <div class="region-progress" :style="{ width: getRegionPercent(region.order_count) + '%' }"></div>
            </div>
            <span class="region-count">{{ region.order_count }} 单</span>
          </div>
          <el-empty v-if="regionStats.length === 0" description="暂无数据" :image-size="60" />
        </div>
      </div>

      <!-- 订单趋势 -->
      <div class="chart-card">
        <div class="panel-header">
          <h3>订单趋势</h3>
          <el-radio-group v-model="chartPeriod" size="small">
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="month">本月</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { statisticsApi, orderApi } from '@/api'
import dayjs from 'dayjs'
import { ORDER_STATUS_MAP, getCardKey } from '@/constants/orderStatus'
import {
  CaretTop, CaretBottom, Plus, Checked, Edit, Box, Position,
  DataLine, ArrowRight, WarningFilled, Warning, Bell,
  FullScreen, Close
} from '@element-plus/icons-vue'

const router = useRouter()
const lineChartRef = ref(null)
const pieChartRef = ref(null)
const chartPeriod = ref('month')
const isFullscreen = ref(false)
let lineChart = null
let pieChart = null

const tasksLoading = ref(false)
const myTasks = ref([])
const alerts = ref([])
const efficiency = ref({ stageDurations: [], overdueOrders: [], todayCompleted: 0, weekCompleted: 0 })
const regionStats = ref([])

// 项目流水线
const pipelineLoading = ref(false)
const pipeline = ref([])
const pipelineTotal = computed(() => pipeline.value.reduce((sum, s) => sum + s.count, 0))

// 团队活跃
const teamLoading = ref(false)
const teamMembers = ref([])

// 通知
const notifLoading = ref(false)
const notifications = ref([])
const unreadCount = computed(() => notifications.value.filter(n => n.is_read === 0).length)

// Tab 切换
const activeTab = ref('tasks')

const statsCards = reactive([
  { key: 'pending', label: '待审核', value: 0, icon: 'Clock', color: '#f59e0b', trend: 0 },
  { key: 'designing', label: '设计中', value: 0, icon: 'Edit', color: '#8b5cf6', trend: 0 },
  { key: 'producing', label: '生产中', value: 0, icon: 'Tools', color: '#6366f1', trend: 0 },
  { key: 'installing', label: '安装中', value: 0, icon: 'Position', color: '#10b981', trend: 0 }
])

const getStatusText = (status) => ORDER_STATUS_MAP[status]?.text || status

const getRoleText = (role) => {
  const map = { admin: '管理员', field_worker: '外勤员', designer: '设计师', producer: '生产员' }
  return map[role] || role
}

const formatDuration = (hours) => {
  if (!hours) return '-'
  if (hours < 24) return `${Math.round(hours)}小时`
  return `${Math.round(hours / 24)}天`
}

const formatTime = (time) => dayjs(time).format('MM-DD HH:mm')

const isOverdue = (date) => new Date(date) < new Date()

const getOverdueDays = (date) => Math.ceil((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))

const getEfficiencyClass = (hours) => {
  if (hours < 24) return 'good'
  if (hours < 72) return 'normal'
  return 'slow'
}

const maxRegionCount = computed(() => Math.max(...regionStats.value.map(r => r.order_count), 1))
const getRegionPercent = (count) => (count / maxRegionCount.value) * 100

// 加载数据
const fetchData = async () => {
  tasksLoading.value = true
  try {
    const [dashboardRes, statsRes, efficiencyRes, alertsRes, tasksRes, regionRes, pipelineRes, teamRes, notifRes] = await Promise.all([
      statisticsApi.getDashboard().catch(() => null),
      statisticsApi.getOrderStats({}).catch(() => null),
      statisticsApi.getEfficiency().catch(() => null),
      statisticsApi.getAlerts().catch(() => null),
      statisticsApi.getMyTasks().catch(() => null),
      statisticsApi.getRegionStats().catch(() => null),
      statisticsApi.getPipeline().catch(() => null),
      statisticsApi.getTeamActivity().catch(() => null),
      statisticsApi.getNotifications({ limit: 20 }).catch(() => null)
    ])

    if (statsRes?.data?.statusDistribution) {
      statsRes.data.statusDistribution.forEach(item => {
        const card = statsCards.find(c => c.key === getCardKey(item.status))
        if (card) card.value += parseInt(item.count)
      })
      updatePieChart(statsRes.data.statusDistribution)
    }

    if (dashboardRes?.data) {
      statsCards.forEach(card => {
        card.trend = dashboardRes.data.growthRate || 0
      })
    }

    if (efficiencyRes?.data) {
      efficiency.value = efficiencyRes.data
    }

    if (alertsRes?.data) {
      alerts.value = alertsRes.data
    }

    if (tasksRes?.data) {
      myTasks.value = tasksRes.data
    }

    if (regionRes?.data) {
      regionStats.value = regionRes.data
    }

    if (pipelineRes?.data) {
      pipeline.value = pipelineRes.data
    }

    if (teamRes?.data) {
      teamMembers.value = teamRes.data
    }

    if (notifRes?.data) {
      notifications.value = notifRes.data
    }

    const revenueRes = await statisticsApi.getRevenueStats({ groupBy: 'month' }).catch(() => null)
    if (revenueRes?.data) {
      updateLineChart(revenueRes.data)
    }
  } catch (err) {
    console.error('加载数据失败:', err)
    setDefaultData()
  } finally {
    tasksLoading.value = false
  }
}

const setDefaultData = () => {
  statsCards[0].value = 12
  statsCards[1].value = 8
  statsCards[2].value = 5
  statsCards[3].value = 3
  initLineChart()
  initPieChart()
}

const initCharts = () => {
  if (lineChartRef.value) lineChart = echarts.init(lineChartRef.value)
  if (pieChartRef.value) pieChart = echarts.init(pieChartRef.value)
}

const updateLineChart = (trendData = []) => {
  if (!lineChart) return
  const recentData = trendData.slice(-6)
  const months = recentData.map(item => {
    const [year, month] = item.period.split('-')
    return `${parseInt(month)}月`
  })
  const newOrderData = recentData.map(item => item.order_count || 0)
  const completedData = recentData.map(item => Math.floor((item.order_count || 0) * 0.8))

  const option = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#374151' } },
    legend: { data: ['新增订单', '完成订单'], bottom: 0, icon: 'roundRect' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: months.length ? months : ['1月', '2月', '3月', '4月', '5月', '6月'], axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280' } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#6b7280' } },
    series: [
      { name: '新增订单', type: 'line', smooth: true, data: months.length ? newOrderData : [15, 18, 22, 28, 25, 20], lineStyle: { width: 3, color: '#6366f1' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99, 102, 241, 0.3)' }, { offset: 1, color: 'rgba(99, 102, 241, 0)' }]) }, itemStyle: { color: '#6366f1' } },
      { name: '完成订单', type: 'line', smooth: true, data: months.length ? completedData : [10, 12, 18, 22, 20, 15], lineStyle: { width: 3, color: '#10b981' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16, 185, 129, 0.3)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]) }, itemStyle: { color: '#10b981' } }
    ]
  }
  lineChart.setOption(option)
}

const updatePieChart = (data) => {
  if (!pieChart) return
  const pieData = data.map(item => {
    const info = ORDER_STATUS_MAP[item.status] || { text: item.status }
    return { value: parseInt(item.count), name: info.text }
  }).filter(item => item.value > 0)

  const option = {
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', borderWidth: 1, textStyle: { color: '#374151' } },
    legend: { orient: 'vertical', right: '5%', top: 'center', icon: 'circle' },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['35%', '50%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: pieData.length ? pieData : [
        { value: 12, name: '待审核', itemStyle: { color: '#f59e0b' } },
        { value: 25, name: '测量中', itemStyle: { color: '#3b82f6' } },
        { value: 18, name: '设计中', itemStyle: { color: '#8b5cf6' } },
        { value: 30, name: '生产中', itemStyle: { color: '#10b981' } },
        { value: 15, name: '安装中', itemStyle: { color: '#ef4444' } }
      ]
    }]
  }
  pieChart.setOption(option)
}

const initLineChart = () => updateLineChart()
const initPieChart = () => updatePieChart([])

const handleResize = () => {
  lineChart?.resize()
  pieChart?.resize()
}

// 全屏切换
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// 流水线点击
const handlePipelineClick = (stage) => {
  const routes = {
    pending_review: '/review',
    measuring: '/order?status=measuring',
    measure_review: '/review?status=measure_review',
    designing: '/design',
    design_review: '/review?status=design_review',
    producing: '/production',
    checking: '/production?status=checking',
    installing: '/install',
    install_review: '/review?status=install_review',
    archived: '/archive'
  }
  router.push(routes[stage.key] || '/order')
}

// 通知操作
const markAllRead = async () => {
  try {
    await statisticsApi.markAllNotificationsRead()
    notifications.value.forEach(n => n.is_read = 1)
    ElMessage.success('全部已读')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleNotifClick = async (notif) => {
  if (notif.is_read === 0) {
    await statisticsApi.markNotificationRead(notif.id).catch(() => {})
    notif.is_read = 1
  }
  if (notif.order_id) {
    router.push(`/order/${notif.order_id}`)
  }
}

// 操作
const handleStatClick = (key) => {
  const routes = {
    pending: '/review',
    designing: '/design',
    producing: '/production',
    installing: '/install'
  }
  router.push(routes[key] || '/order')
}

const handleAlertClick = (alert) => {
  if (alert.type === 'overdue') {
    router.push('/order?overdue=1')
  } else if (alert.type === 'task') {
    router.push('/review')
  }
}

const goToTask = (task) => {
  const routes = {
    pending_review: `/review/${task.id}`,
    designing: `/design/${task.id}`,
    design_review: `/review/${task.id}`,
    producing: `/production/${task.id}`,
    checking: `/production/${task.id}`,
    installing: `/install/${task.id}`,
    install_review: `/review/${task.id}`
  }
  router.push(routes[task.status] || `/order/${task.id}`)
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 全屏模式 */
.fullscreen-mode {
  min-height: 100vh;
  padding: 8px 24px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.fullscreen-mode .alert-item,
.fullscreen-mode .stat-card,
.fullscreen-mode .quick-actions,
.fullscreen-mode .pipeline-panel,
.fullscreen-mode .combined-panel,
.fullscreen-mode .efficiency-panel,
.fullscreen-mode .team-panel,
.fullscreen-mode .chart-card,
.fullscreen-mode .region-panel {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(100, 116, 139, 0.3);
  color: #e2e8f0;
}

.fullscreen-mode .panel-header h3,
.fullscreen-mode .stage-label,
.fullscreen-mode .task-title,
.fullscreen-mode .notif-title,
.fullscreen-mode .member-name,
.fullscreen-mode .region-count,
.fullscreen-mode .stat-value {
  color: #f1f5f9;
}

.fullscreen-mode .stage-name,
.fullscreen-mode .task-meta,
.fullscreen-mode .notif-content,
.fullscreen-mode .member-role,
.fullscreen-mode .region-name,
.fullscreen-mode .stat-label,
.fullscreen-mode .efficiency-summary,
.fullscreen-mode .summary-item {
  color: #94a3b8;
}

.fullscreen-mode .stage-bar {
  background: rgba(51, 65, 85, 0.6);
}

.fullscreen-mode .tab-item {
  color: #94a3b8;
  border-bottom-color: transparent;
}

.fullscreen-mode .tab-item.active {
  color: #60a5fa;
  border-bottom-color: #3b82f6;
}

.fullscreen-mode .task-item:hover {
  background: rgba(51, 65, 85, 0.4);
}

.fullscreen-mode .notif-item:hover {
  background: rgba(51, 65, 85, 0.4);
}

/* 全屏切换按钮 */
.fullscreen-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.fullscreen-toggle:hover {
  background: var(--brand-primary, #3b82f6);
  color: #fff;
  border-color: var(--brand-primary, #3b82f6);
}

/* 项目流水线 */
.pipeline-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  border: 1px solid var(--border);
}

.pipeline-total {
  font-size: 13px;
  color: var(--text-secondary);
}

.pipeline-flow {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  padding: 8px 0;
}

.pipeline-stage {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.stage-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--bg-tertiary, #f3f4f6);
  border: 1px solid transparent;
  transition: all 0.2s;
  min-width: 120px;
  justify-content: center;
}

.pipeline-stage.has-orders .stage-card {
  background: var(--brand-primary-light, #eff6ff);
  border-color: var(--brand-primary-border, #bfdbfe);
}

.stage-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}

.pipeline-stage.has-orders .stage-dot {
  background: var(--brand-primary, #3b82f6);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}

.stage-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.pipeline-stage.has-orders .stage-label {
  color: var(--text-primary);
  font-weight: 500;
}

.stage-count {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 20px;
  text-align: center;
}

.stage-handlers {
  font-size: 11px;
  color: var(--brand-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.stage-arrow {
  color: var(--text-tertiary, #d1d5db);
  font-size: 14px;
  padding: 0 4px;
  flex-shrink: 0;
}

/* 预警栏 */
.alerts-bar {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.alert-item.danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.alert-item.warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.alert-item.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

.alert-icon { font-size: 18px; }
.alert-title { font-weight: 600; }
.alert-count {
  background: currentColor;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.alert-message { font-size: 13px; opacity: 0.8; }

/* 快捷入口 */
.quick-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-item:hover { background: var(--bg-tertiary); }

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.action-icon.create { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.action-icon.review { background: rgba(22, 163, 74, 0.1); color: #16a34a; }
.action-icon.design { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.action-icon.produce { background: rgba(234, 88, 12, 0.1); color: #ea580c; }
.action-icon.install { background: rgba(5, 150, 105, 0.1); color: #059669; }
.action-icon.stats { background: rgba(71, 85, 105, 0.1); color: #475569; }

.action-item span { font-size: 13px; color: var(--text-secondary); }

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  padding: 20px;
  border: 1px solid var(--border);
  transition: all 0.3s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
}

.stat-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.stat-info { display: flex; flex-direction: column; }

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-card.pending .stat-icon { background: var(--brand-primary-light); color: #f59e0b; }
.stat-card.designing .stat-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.stat-card.producing .stat-icon { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
.stat-card.installing .stat-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
}

.stat-trend .up { color: #10b981; }
.stat-trend .down { color: #ef4444; }

/* 主内容区 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1200px) {
  .main-content { grid-template-columns: 1fr; }
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 通知+待办合并面板 */
.combined-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
}

.tab-item {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--brand-primary, #3b82f6);
  border-bottom-color: var(--brand-primary, #3b82f6);
}

.tab-badge {
  font-size: 11px;
}

.tab-content {
  max-height: 320px;
  overflow-y: auto;
}

.notif-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border);
}

.notif-item:hover { background: var(--bg-tertiary); }

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.notif-dot.unread { background: var(--brand-primary, #3b82f6); }
.notif-dot.read { background: var(--text-tertiary, #d1d5db); }

.notif-info { flex: 1; min-width: 0; }

.notif-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.notif-content {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-time {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* 待办任务 */
.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border);
}

.task-item:hover { background: var(--bg-tertiary); }

.task-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-status.pending_review, .task-status.design_review, .task-status.install_review { background: #f59e0b; }
.task-status.designing { background: #8b5cf6; }
.task-status.producing, .task-status.checking { background: #10b981; }
.task-status.installing { background: #ef4444; }

.task-info { flex: 1; min-width: 0; }

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.task-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.task-time .overdue {
  color: #ef4444;
  font-weight: 500;
}

.task-arrow {
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 效率指标 */
.efficiency-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  border: 1px solid var(--border);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.efficiency-summary {
  display: flex;
  gap: 16px;
}

.summary-item {
  font-size: 13px;
  color: var(--text-secondary);
}

.summary-item strong {
  color: var(--text-primary);
  font-size: 15px;
}

.efficiency-bars {
  display: flex;
  gap: 24px;
}

.efficiency-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.stage-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.stage-progress {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s;
}

.stage-progress.good { background: #10b981; }
.stage-progress.normal { background: #f59e0b; }
.stage-progress.slow { background: #ef4444; }

.stage-hours {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 团队活跃 */
.team-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.team-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.team-list {
  max-height: 380px;
  overflow-y: auto;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}

.team-member:last-child { border-bottom: none; }

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-primary-light, #eff6ff);
  color: var(--brand-primary, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.member-info { flex: 1; min-width: 0; }

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.member-role {
  font-size: 12px;
  color: var(--text-tertiary);
}

.member-stats {
  text-align: center;
  padding: 0 8px;
}

.stat-number {
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-primary, #3b82f6);
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.member-area {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.area-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.member-statuses {
  display: flex;
  gap: 4px;
}

.status-tag {
  font-size: 11px;
  background: var(--bg-tertiary, #f3f4f6);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 图表 */
.charts-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.chart-container {
  height: 200px;
  padding: 0 12px 12px;
}

/* 底部区域 */
.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1200px) {
  .bottom-section { grid-template-columns: 1fr; }
}

.region-panel, .overdue-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 16px;
}

.region-list, .overdue-list {
  max-height: 200px;
  overflow-y: auto;
}

.region-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.region-item:last-child { border-bottom: none; }

.region-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.region-bar {
  width: 80px;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.region-progress {
  height: 100%;
  background: var(--brand-primary);
  border-radius: 3px;
}

.region-count {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.warning-title {
  color: #dc2626;
}

.overdue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.overdue-item:hover { background: var(--bg-tertiary); margin: 0 -16px; padding: 10px 16px; }
.overdue-item:last-child { border-bottom: none; }

.overdue-no {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.overdue-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.overdue-days.danger {
  color: #dc2626;
  font-weight: 600;
}
</style>
