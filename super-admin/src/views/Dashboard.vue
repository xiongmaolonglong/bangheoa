<template>
  <div>
    <h1 class="page-title">全局工作台</h1>

    <div class="stat-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value">23</div>
        <div class="stat-label">租户数</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value primary">1,234</div>
        <div class="stat-label">工单总量</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value warning">456</div>
        <div class="stat-label">进行中</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-value success">18</div>
        <div class="stat-label">今日新增</div>
      </el-card>
    </div>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="14">
        <el-card>
          <template #header><span>工单趋势（近 30 天）</span></template>
          <div ref="lineChartRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header><span>租户工单 TOP 10</span></template>
          <div ref="barChartRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="mt-16">
      <template #header><span>最近活跃的租户</span></template>
      <el-table :data="activeTenants" stripe>
        <el-table-column prop="name" label="租户名称" min-width="200" />
        <el-table-column prop="region" label="地区" width="180" />
        <el-table-column prop="todayOrders" label="今日工单" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '已暂停' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <router-link :to="`/tenants/${row.id}`" class="link">查看</router-link>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const lineChartRef = ref()
const barChartRef = ref()
let lineChart, barChart

const activeTenants = ref([
  { id: 1, name: '盛世文化传媒有限公司', region: '广东省-深圳市', todayOrders: 8, status: 'active' },
  { id: 2, name: '华艺广告制作有限公司', region: '广东省-广州市', todayOrders: 5, status: 'active' },
  { id: 3, name: '博视标识设计工程公司', region: '广东省-东莞市', todayOrders: 3, status: 'active' },
  { id: 4, name: '瑞达展示展览有限公司', region: '广东省-佛山市', todayOrders: 2, status: 'active' },
  { id: 5, name: '天合美陈广告有限公司', region: '广东省-珠海市', todayOrders: 1, status: 'active' }
])

function initCharts() {
  // Line chart
  lineChart = echarts.init(lineChartRef.value)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 29 + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: days, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      data: [12,19,15,22,18,25,20,28,24,30,26,35,32,28,33,40,38,42,36,45,43,50,48,52,47,55,53,58,56,62],
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(114,46,209,0.3)' },
          { offset: 1, color: 'rgba(114,46,209,0.02)' }
        ])
      },
      lineStyle: { color: '#722ed1', width: 2 },
      itemStyle: { color: '#722ed1' }
    }]
  })

  // Bar chart
  barChart = echarts.init(barChartRef.value)
  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: ['天合美陈', '瑞达展示', '博视标识', '华艺广告', '盛世传媒', '亮点传媒', '创意视觉', '信达广告', '宏远标识', '万通传媒'],
      axisLabel: { fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: [31, 54, 73, 96, 128, 87, 65, 52, 48, 41],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#722ed1' },
          { offset: 1, color: '#b37feb' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: 16
    }]
  })
}

onMounted(() => {
  setTimeout(() => initCharts(), 100)
  window.addEventListener('resize', () => {
    lineChart?.resize()
    barChart?.resize()
  })
})

onUnmounted(() => {
  lineChart?.dispose()
  barChart?.dispose()
})
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { text-align: center; padding: 20px 0; }
.stat-value { font-size: 32px; font-weight: 700; color: #1a1a1a; }
.stat-value.primary { color: #722ed1; }
.stat-value.warning { color: #e6a23c; }
.stat-value.success { color: #67c23a; }
.stat-label { margin-top: 4px; color: #8c8c8c; font-size: 14px; }
.mt-16 { margin-top: 16px; }
.chart { width: 100%; height: 300px; }
.link { color: #722ed1; text-decoration: none; }
</style>
