<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">数据看板</h1>
      <p class="page-desc">实时掌握工单进度与业务状况</p>
    </div>

    <!-- Stats Cards -->
    <el-row :gutter="16" class="mb-20">
      <el-col :span="4" v-for="stat in stats" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-change" :class="stat.changeType">{{ stat.change }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Alert -->
    <el-alert v-if="timeoutList.length" :title="`${timeoutList.length} 条工单超时`" type="warning"
      :description="timeoutDesc" show-icon closable class="mb-20">
      <template #default>
        <el-button size="small" type="primary" @click="$router.push('/work-orders')">立即处理</el-button>
      </template>
    </el-alert>

    <!-- Chart + Recent -->
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>近 30 天工单趋势</span>
              <div>
                <el-tag type="primary" size="small" class="mr-8">新建 32</el-tag>
                <el-tag type="success" size="small">完成 28</el-tag>
              </div>
            </div>
          </template>
          <div class="chart-area">
            <div class="chart-bar" v-for="(h, i) in chartData" :key="i" :style="{ height: h + 'px' }"></div>
            <div class="chart-labels">
              <span>4/1</span><span>4/3</span><span>4/5</span><span>4/7</span><span>4/9</span><span>4/11</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>超时预警</span>
              <el-tag type="danger" size="small">{{ timeoutList.length }}</el-tag>
            </div>
          </template>
          <el-table :data="timeoutList" size="small" style="width:100%">
            <el-table-column>
              <template #default="{ row }">
                <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
                <div class="text-muted">{{ row.title }}</div>
              </template>
            </el-table-column>
            <el-table-column width="80">
              <template #default="{ row }">
                <el-tag size="small" type="warning">{{ row.stage }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'

const stats = ref([
  { label: '申报待接收', value: 0, change: '较昨日 +0', changeType: 'flat' },
  { label: '待派单', value: 0, change: '较昨日 +0', changeType: 'flat' },
  { label: '测量中', value: 0, change: '无变化', changeType: 'flat' },
  { label: '设计中', value: 0, change: '较昨日 +0', changeType: 'flat' },
  { label: '待施工', value: 0, change: '较昨日 +0', changeType: 'flat' },
  { label: '待结算', value: 0, change: '无变化', changeType: 'flat' }
])
const timeoutList = ref([])
const chartData = ref([40, 55, 45, 70, 60, 80, 50, 65, 90, 75, 55, 40])

const timeoutDesc = computed(() => {
  return timeoutList.value.map(t => `${t.work_order_no}（${t.stage}超时）`).join('、')
})

onMounted(async () => {
  try {
    const res = await api.get('/work-orders/stats')
    const data = res.data || {}
    const stageCount = data.by_stage || {}
    const labels = ['申报接收', '待派单', '测量中', '设计中', '生产中', '待施工']
    const keys = ['declaration', 'assignment', 'measurement', 'design', 'production', 'construction']
    stats.value = labels.map((label, i) => ({
      label, value: stageCount[keys[i]] || 0,
      change: '较昨日 +0', changeType: 'flat'
    }))
    timeoutList.value = data.timeout_orders || []
  } catch {
    // Demo data when backend is not running
    stats.value[0].value = 5
    stats.value[1].value = 3
    stats.value[2].value = 2
    stats.value[3].value = 4
    stats.value[4].value = 6
    stats.value[5].value = 2
  }
})
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.page-desc { color: #8c8c8c; font-size: 14px; margin-top: 4px; }
.mb-20 { margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-label { color: #8c8c8c; font-size: 13px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 600; color: #1a1a1a; }
.stat-change { font-size: 12px; margin-top: 4px; }
.stat-change.up { color: #52c41a; }
.stat-change.down { color: #f5222d; }
.stat-change.flat { color: #8c8c8c; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.mr-8 { margin-right: 8px; }
.chart-area {
  height: 240px; display: flex; align-items: flex-end; justify-content: center;
  gap: 8px; padding: 20px 20px 30px; position: relative; background: #fafafa; border-radius: 6px;
}
.chart-bar {
  width: 28px; background: linear-gradient(180deg, #1890ff 0%, #69c0ff 100%);
  border-radius: 4px 4px 0 0;
}
.chart-labels {
  position: absolute; bottom: 8px; left: 0; right: 0;
  display: flex; justify-content: space-around; font-size: 11px; color: #8c8c8c;
}
.wo-link { color: #1890ff; font-family: monospace; font-size: 13px; }
.text-muted { color: #8c8c8c; font-size: 12px; }
</style>
