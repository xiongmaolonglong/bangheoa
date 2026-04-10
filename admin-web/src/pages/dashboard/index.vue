<template>
  <div class="dashboard">
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

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 待办任务 -->
      <div class="tasks-panel">
        <div class="panel-header">
          <h3>我的待办</h3>
          <el-button text type="primary" size="small" @click="viewAllTasks">查看全部</el-button>
        </div>
        <div class="tasks-list" v-loading="tasksLoading">
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
      </div>

      <!-- 图表区域 -->
      <div class="charts-panel">
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
        <div class="chart-card">
          <div class="panel-header">
            <h3>状态分布</h3>
          </div>
          <div ref="pieChartRef" class="chart-container"></div>
        </div>
      </div>
    </div>

    <!-- 区域分布 & 超时预警 -->
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

      <!-- 超时预警 -->
      <div class="overdue-panel" v-if="efficiency.overdueOrders?.length">
        <div class="panel-header">
          <h3 class="warning-title">
            <el-icon><WarningFilled /></el-icon>
            超时预警
          </h3>
        </div>
        <div class="overdue-list">
          <div
            v-for="order in efficiency.overdueOrders.slice(0, 6)"
            :key="order.id"
            class="overdue-item"
            @click="$router.push(`/order/${order.id}`)"
          >
            <span class="overdue-no">{{ order.order_no }}</span>
            <span class="overdue-status">{{ getStatusText(order.status) }}</span>
            <span class="overdue-days danger">{{ order.overdue_days }}天</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { statisticsApi, orderApi } from '@/api'
import dayjs from 'dayjs'
import { ORDER_STATUS_MAP, getCardKey } from '@/constants/orderStatus'
import {
  CaretTop, CaretBottom, Plus, Checked, Edit, Box, Position,
  DataLine, ArrowRight, WarningFilled, Warning, Bell
} from '@element-plus/icons-vue'

const router = useRouter()
const lineChartRef = ref(null)
const pieChartRef = ref(null)
const chartPeriod = ref('month')
let lineChart = null
let pieChart = null

const tasksLoading = ref(false)
const myTasks = ref([])
const alerts = ref([])
const efficiency = ref({ stageDurations: [], overdueOrders: [], todayCompleted: 0, weekCompleted: 0 })
const regionStats = ref([])

const statsCards = reactive([
  { key: 'pending', label: '待审核', value: 0, icon: 'Clock', color: '#f59e0b', trend: 0 },
  { key: 'designing', label: '设计中', value: 0, icon: 'Edit', color: '#8b5cf6', trend: 0 },
  { key: 'producing', label: '生产中', value: 0, icon: 'Tools', color: '#6366f1', trend: 0 },
  { key: 'installing', label: '安装中', value: 0, icon: 'Position', color: '#10b981', trend: 0 }
])

// 获取状态文本
const getStatusText = (status) => ORDER_STATUS_MAP[status]?.text || status

// 格式化时长
const formatDuration = (hours) => {
  if (!hours) return '-'
  if (hours < 24) return `${Math.round(hours)}小时`
  return `${Math.round(hours / 24)}天`
}

// 格式化时间
const formatTime = (time) => dayjs(time).format('MM-DD HH:mm')

// 是否逾期
const isOverdue = (date) => new Date(date) < new Date()

// 逾期天数
const getOverdueDays = (date) => Math.ceil((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))

// 效率颜色
const getEfficiencyClass = (hours) => {
  if (hours < 24) return 'good'
  if (hours < 72) return 'normal'
  return 'slow'
}

// 区域百分比
const maxRegionCount = computed(() => Math.max(...regionStats.value.map(r => r.order_count), 1))
const getRegionPercent = (count) => (count / maxRegionCount.value) * 100

// 加载数据
const fetchData = async () => {
  tasksLoading.value = true
  try {
    // 并行请求
    const [dashboardRes, statsRes, efficiencyRes, alertsRes, tasksRes, regionRes] = await Promise.all([
      statisticsApi.getDashboard().catch(() => null),
      statisticsApi.getOrderStats({}).catch(() => null),
      statisticsApi.getEfficiency().catch(() => null),
      statisticsApi.getAlerts().catch(() => null),
      statisticsApi.getMyTasks().catch(() => null),
      statisticsApi.getRegionStats().catch(() => null)
    ])

    // 统计卡片
    if (statsRes?.data?.statusDistribution) {
      statsRes.data.statusDistribution.forEach(item => {
        const card = statsCards.find(c => c.key === getCardKey(item.status))
        if (card) card.value += parseInt(item.count)
      })
      updatePieChart(statsRes.data.statusDistribution)
    }

    // 增长趋势
    if (dashboardRes?.data) {
      statsCards.forEach(card => {
        card.trend = dashboardRes.data.growthRate || 0
      })
    }

    // 效率指标
    if (efficiencyRes?.data) {
      efficiency.value = efficiencyRes.data
    }

    // 预警
    if (alertsRes?.data) {
      alerts.value = alertsRes.data
    }

    // 待办任务
    if (tasksRes?.data) {
      myTasks.value = tasksRes.data
    }

    // 区域分布
    if (regionRes?.data) {
      regionStats.value = regionRes.data
    }

    // 趋势图
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

const viewAllTasks = () => {
  router.push('/review')
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

/* 主内容区 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1200px) {
  .main-content { grid-template-columns: 1fr; }
}

/* 待办任务 */
.tasks-panel {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.tasks-list {
  max-height: 320px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
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
