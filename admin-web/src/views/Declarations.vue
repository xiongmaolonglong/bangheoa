<template>
  <div>
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">申报接收</h1>
        <p class="page-desc">接收甲方企业提交的申报工单</p>
      </div>
      <div>
        <el-button @click="fetchList" :icon="Refresh" circle title="刷新" />
        <el-button type="primary" :disabled="!selectedRows.length" @click="batchReceive">
          批量接收（{{ selectedRows.length }}）
        </el-button>
      </div>
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

    <!-- 列表 -->
    <el-card>
      <el-table :data="list" stripe v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="work_order_no" label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="client_name" label="甲方企业" width="140" />
        <el-table-column prop="project_type" label="类型" width="100" />
        <el-table-column label="需求摘要" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="申报时间" width="160" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" size="small" :loading="receiving[row.id]" @click="handleReceive(row)">接收</el-button>
            <router-link :to="`/work-orders/${row.id}`"><el-button size="small">查看</el-button></router-link>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !list.length" description="暂无待接收的申报" />

      <!-- 分页 -->
      <div class="pagination-box">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'

const list = ref([])
const loading = ref(false)
const receiving = ref({})
const selectedRows = ref([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const statCards = reactive([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

async function fetchList() {
  loading.value = true
  try {
    const params = { stage: 'declaration', page: pagination.page, limit: pagination.pageSize }
    const res = await api.get('/tenant/declarations', { params })
    const payload = res.data?.list || res.data || []
    list.value = Array.isArray(payload) ? payload : []
    pagination.total = res.data?.total || list.value.length
    // 统计
    statCards.length = 0
    statCards.push(
      { label: '待接收', count: pagination.total, color: '#e6a23c' },
      { label: '今日申报', count: list.value.filter(r => r.created_at?.startsWith(new Date().toISOString().split('T')[0])).length, color: '#2563eb' },
      { label: '甲方企业', count: [...new Set(list.value.map(r => r.client_id))].length, color: '#16a34a' },
      { label: '已选', count: selectedRows.value.length, color: '#6b7280' },
    )
  } catch {
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function handleReceive(row) {
  receiving.value[row.id] = true
  try {
    await api.post(`/tenant/declarations/${row.id}/receive`)
    ElMessage.success(`已接收工单 ${row.work_order_no}`)
    list.value = list.value.filter(w => w.id !== row.id)
    await fetchList()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '接收失败')
  } finally {
    receiving.value[row.id] = false
  }
}

async function batchReceive() {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确认批量接收 ${selectedRows.value.length} 个工单？`, '提示', { type: 'warning' })
    for (const row of selectedRows.value) {
      await api.post(`/tenant/declarations/${row.id}/receive`)
    }
    ElMessage.success(`${selectedRows.value.length} 个工单已接收`)
    selectedRows.value = []
    await fetchList()
  } catch {}
}

onMounted(fetchList)
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.page-header { margin-bottom: var(--space-6); }
.page-desc { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.mb-20 { margin-bottom: var(--space-5); }
.stat-card .stat-body { text-align: center; padding: var(--space-2) 0; }
.stat-number { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.pagination-box { display: flex; justify-content: flex-end; margin-top: var(--space-4); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
</style>
