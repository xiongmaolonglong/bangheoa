<template>
  <el-row :gutter="16" class="stats-panel">
    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e6f7ff;color:#1890ff">
            <el-icon :size="24"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">工单总数</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-icon" style="background:#f6ffed;color:#52c41a">
            <el-icon :size="24"><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.by_stage?.archive || 0 }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-icon" style="background:#fff2e8;color:#fa541c">
            <el-icon :size="24"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value" style="color:#fa541c">{{ stats.timeout_count }}</div>
            <div class="stat-label">超时工单</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-icon" style="background:#f9f0ff;color:#722ed1">
            <el-icon :size="24"><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ completionRate }}%</div>
            <div class="stat-label">完成率</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
  <div class="chart-row">
    <el-card style="flex:1">
      <v-chart class="chart" :option="stageChartOption" autoresize />
    </el-card>
    <el-card style="flex:1">
      <v-chart class="chart" :option="pieChartOption" autoresize />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { Document, CircleCheck, Clock, TrendCharts } from '@element-plus/icons-vue'
import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/pie'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/title'
import api from '../api'

const stats = ref({ total: 0, by_stage: {}, by_status: {}, timeout_count: 0 })

const completionRate = computed(() => {
  const total = stats.value.total || 0
  const done = stats.value.by_stage?.archive || 0
  return total ? ((done / total) * 100).toFixed(1) : '0'
})

const stageLabels = {
  declaration: '申报', approval: '审批', assignment: '派单', measurement: '测量',
  design: '设计', production: '生产', construction: '施工', finance: '费用', archive: '归档'
}
const statusLabels = {
  draft: '草稿', submitted: '已提交', assigned: '已派单', measuring: '测量中',
  measured: '已测量', designing: '设计中', producing: '生产中', constructing: '施工中',
  completed: '已完成', quoting: '报价中', archived: '已归档'
}

const stageChartOption = computed(() => ({
  title: { text: '各环节工单数', left: 'center', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: Object.keys(stats.value.by_stage).map(k => stageLabels[k] || k),
  },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar',
    data: Object.values(stats.value.by_stage),
    itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
  }],
}))

const pieChartOption = computed(() => ({
  title: { text: '状态分布', left: 'center', textStyle: { fontSize: 14 } },
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    data: Object.entries(stats.value.by_status).map(([key, value]) => ({
      name: statusLabels[key] || key,
      value,
    })),
  }],
}))

onMounted(async () => {
  try {
    const res = await api.get('/work-orders/stats')
    stats.value = res.data || {}
  } catch (e) {
    console.error('加载统计失败:', e)
  }
})
</script>

<style scoped>
.stats-panel { margin-bottom: var(--space-4); }
.stat-card { display: flex; align-items: center; gap: 12px; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-value { font-size: 24px; font-weight: 600; color: #1a1a1a; }
.stat-label { font-size: 12px; color: #8c8c8c; }
.chart-row { display: flex; gap: 16px; margin-bottom: 16px; }
.chart { height: 280px; }
</style>
