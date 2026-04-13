<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">派单管理</h1>
      <p class="page-desc">查看待派单工单与测量员工作负载</p>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="mb-20">
      <el-col :span="6" v-for="stat in statCards" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-body">
            <div class="stat-number" :style="{ color: stat.color }">{{ stat.count }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 待派单工单 -->
      <el-col :span="14">
        <el-card>
          <template #header><span class="section-title">待派单工单</span></template>
          <el-table :data="pendingList" stripe v-loading="loading">
            <el-table-column prop="work_order_no" label="工单号" width="160">
              <template #default="{ row }">
                <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="项目名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="client_name" label="甲方" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="goDispatch(row)">派单</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !pendingList.length" description="暂无待派单工单" />
        </el-card>
      </el-col>

      <!-- 测量员负载 -->
      <el-col :span="10">
        <el-card>
          <template #header><span class="section-title">测量员工作负载</span></template>
          <div v-if="measurerStats.length" class="measurer-list">
            <div v-for="m in measurerStats" :key="m.id" class="measurer-item">
              <div class="measurer-info">
                <span class="measurer-name">{{ m.name }}</span>
                <span class="measurer-count">{{ m.task_count || 0 }} 个任务</span>
              </div>
              <el-progress :percentage="Math.min((m.task_count || 0) * 20, 100)" :color="m.task_count > 4 ? '#dc2626' : '#16a34a'" :stroke-width="6" />
            </div>
          </div>
          <el-empty v-else description="暂无测量员数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const pendingList = ref([])
const measurerStats = ref([])
const statCards = reactive([])

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/work-orders', { params: { stage: 'assignment', limit: 50 } })
    const payload = res.data?.list || res.data || []
    pendingList.value = Array.isArray(payload) ? payload.filter(w => !w.assigned_tenant_user_id) : []
  } catch {
    pendingList.value = []
  } finally {
    loading.value = false
  }
}

async function fetchMeasurers() {
  try {
    const res = await api.get('/tenants/users')
    const users = res.data?.list || res.data || []
    const measurers = users.filter(u => u.role === 'measurer' && u.status === 'active')
    measurerStats.value = measurers
    statCards.length = 0
    statCards.push(
      { label: '待派单', count: pendingList.value.length, color: '#e6a23c' },
      { label: '测量员', count: measurers.length, color: '#2563eb' },
      { label: '已派单', count: measurers.reduce((s, m) => s + (m.task_count || 0), 0), color: '#16a34a' },
      { label: '平均负载', count: measurers.length ? Math.round(measurers.reduce((s, m) => s + (m.task_count || 0), 0) / measurers.length) : 0, color: '#6b7280' },
    )
  } catch {
    measurerStats.value = []
  }
}

function goDispatch(row) {
  router.push(`/work-orders/${row.id}`)
}

onMounted(() => { fetchList(); fetchMeasurers() })
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.page-desc { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.mb-20 { margin-bottom: var(--space-5); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.stat-card .stat-body { text-align: center; padding: var(--space-2) 0; }
.stat-number { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
.measurer-list { max-height: 400px; overflow-y: auto; }
.measurer-item { padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); }
.measurer-item:last-child { border-bottom: none; }
.measurer-info { display: flex; justify-content: space-between; margin-bottom: var(--space-2); }
.measurer-name { font-weight: var(--font-weight-medium); }
.measurer-count { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
</style>
