<template>
  <div class="statistics-page">
    <!-- 筛选条件 -->
    <div class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ orderStats.total || 0 }}<span class="stat-unit">单</span></div>
        <div class="stat-label">总订单数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ orderStats.inProgress || 0 }}<span class="stat-unit">单</span></div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ orderStats.completed || 0 }}<span class="stat-unit">单</span></div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ (orderStats.totalArea || 0).toFixed(2) }}<span class="stat-unit">㎡</span></div>
        <div class="stat-label">总面积</div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <div class="chart-card">
        <h4>订单状态分布</h4>
        <div ref="statusChartRef" class="chart-container"></div>
      </div>
      <div class="chart-card">
        <h4>月度订单趋势</h4>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 人员绩效 -->
    <div class="table-card">
      <h4>人员绩效排行</h4>
      <el-table :data="performanceData" stripe>
        <el-table-column prop="real_name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ roleMap[row.role] || row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="completed_count" label="完成任务数" width="120" />
        <el-table-column prop="total_area" label="总面积(㎡)" width="120">
          <template #default="{ row }">
            {{ (row.total_area || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="avg_duration" label="平均耗时(天)" width="120">
          <template #default="{ row }">
            {{ (row.avg_duration || 0).toFixed(1) }}
          </template>
        </el-table-column>
        <el-table-column label="绩效评分" width="200">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled show-score />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { statisticsApi } from '@/api'
import * as echarts from 'echarts'

const statusChartRef = ref(null)
const trendChartRef = ref(null)
let statusChart = null
let trendChart = null

const filterForm = reactive({
  dateRange: []
})

const dateShortcuts = [
  {
    text: '本周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '本月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(1)
      return [start, end]
    }
  },
  {
    text: '本季度',
    value: () => {
      const end = new Date()
      const start = new Date()
      const month = start.getMonth()
      start.setMonth(Math.floor(month / 3) * 3)
      start.setDate(1)
      return [start, end]
    }
  }
]

const orderStats = reactive({
  total: 0,
  inProgress: 0,
  completed: 0,
  totalArea: 0,
  statusDistribution: []
})

const performanceData = ref([])

const roleMap = {
  admin: '管理员',
  reviewer: '审核主管',
  designer: '设计师',
  producer: '生产员',
  checker: '核对员',
  installer: '安装员'
}

// 获取数据
const fetchData = async () => {
  try {
    const params = {}
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }

    // 获取订单统计
    const orderRes = await statisticsApi.getOrderStats(params)
    if (orderRes.data) {
      Object.assign(orderStats, orderRes.data)
    }

    // 获取人员绩效
    const perfRes = await statisticsApi.getPerformance(params)
    performanceData.value = perfRes.data || []

    // 获取收入统计（用于月度趋势）
    const revenueRes = await statisticsApi.getRevenueStats({ groupBy: 'month' })
    trendData.value = revenueRes.data || []

    // 更新图表
    await nextTick()
    updateCharts()
  } catch (err) {
    console.error(err)
    // 使用模拟数据
    loadMockData()
  }
}

// 模拟数据
const loadMockData = () => {
  orderStats.total = 156
  orderStats.inProgress = 23
  orderStats.completed = 128
  orderStats.totalArea = 4580.5

  performanceData.value = [
    { real_name: '张三', role: 'installer', completed_count: 45, total_area: 1250, avg_duration: 2.3, rating: 5 },
    { real_name: '李四', role: 'designer', completed_count: 38, total_area: 980, avg_duration: 1.5, rating: 4 },
    { real_name: '王五', role: 'designer', completed_count: 32, total_area: 860, avg_duration: 3.2, rating: 4 },
    { real_name: '赵六', role: 'producer', completed_count: 28, total_area: 720, avg_duration: 4.1, rating: 3 }
  ]

  updateCharts()
}

// 初始化图表
const initCharts = () => {
  if (statusChartRef.value) {
    statusChart = echarts.init(statusChartRef.value)
  }
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
}

// 状态颜色映射
const statusColorMap = {
  'pending_review': '#f59e0b',
  'designing': '#8b5cf6',
  'design_review': '#a855f7',
  'producing': '#ec4899',
  'checking': '#f97316',
  'installing': '#10b981',
  'install_review': '#14b8a6',
  'archived': '#6b7280'
}

const statusNameMap = {
  'pending_review': '待审核',
  'designing': '设计中',
  'design_review': '待设计审核',
  'producing': '生产中',
  'checking': '核对中',
  'installing': '安装中',
  'install_review': '待安装审核',
  'archived': '已归档'
}

// 月度趋势数据
const trendData = ref([])

// 更新图表
const updateCharts = () => {
  // 状态分布饼图 - 使用真实状态分布数据
  if (statusChart && orderStats.statusDistribution) {
    const pieData = orderStats.statusDistribution.map(item => ({
      value: parseInt(item.count),
      name: statusNameMap[item.status] || item.status,
      itemStyle: { color: statusColorMap[item.status] || '#909399' }
    })).filter(item => item.value > 0)

    statusChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: pieData.length > 0 ? pieData : [
          { value: orderStats.inProgress, name: '进行中', itemStyle: { color: '#409eff' } },
          { value: orderStats.completed, name: '已完成', itemStyle: { color: '#67c23a' } }
        ]
      }]
    })
  }

  // 月度趋势折线图 - 使用真实数据
  if (trendChart && trendData.value.length > 0) {
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.value.map(item => item.period)
      },
      yAxis: { type: 'value' },
      series: [{
        name: '订单数',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: trendData.value.map(item => item.order_count)
      }]
    })
  }
}

// 窗口大小变化时重新调整图表
const handleResize = () => {
  statusChart?.resize()
  trendChart?.resize()
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  statusChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped>
.statistics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 筛选卡片 */
.filter-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  border: 1px solid var(--border);
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

/* 统计行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 图表行 */
.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
}

.chart-card h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-container {
  height: 300px;
}

/* 表格卡片 */
.table-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
}

.table-card h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 1200px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
