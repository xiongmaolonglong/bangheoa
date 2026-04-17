<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">操作日志审计</h1>
      <div class="page-actions">
        <el-input v-model="keyword" placeholder="搜索工单号/操作人/内容" clearable style="width:240px" @change="loadLogs">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterAction" placeholder="全部操作" clearable style="width:120px" @change="loadLogs">
          <el-option label="创建" value="create" />
          <el-option label="编辑" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="派单" value="assign" />
          <el-option label="环节推进" value="advance" />
          <el-option label="备注" value="remark" />
          <el-option label="审核" value="review" />
          <el-option label="确认" value="confirm" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:220px" @change="loadLogs" />
        <el-button @click="loadLogs" :loading="loading"><el-icon><Refresh /></el-icon>刷新</el-button>
        <el-button @click="exportLogs"><el-icon><Download /></el-icon>导出</el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="mb-20">
      <el-col :span="6" v-for="stat in logStats" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.count }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 日志列表 -->
    <el-card v-loading="loading">
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/work-orders/${row.work_order_id}`" class="wo-link">
              {{ row.work_order_no || '-' }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">{{ row.operator_name || row.created_by || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作类型" width="110">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作内容" min-width="300">
          <template #default="{ row }">
            <span class="log-content">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.created_at }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap" v-if="total > pageSize">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
          :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next"
          @size-change="loadLogs" @current-change="loadLogs" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api'
import { exportWithTimestamp } from '../utils/export'

const loading = ref(false)
const list = ref([])
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const keyword = ref('')
const filterAction = ref('')
const dateRange = ref(null)

const actionMap = {
  create: '创建', update: '编辑', delete: '删除', assign: '派单',
  advance: '环节推进', remark: '备注', review: '审核', confirm: '确认',
  tag_update: '标签更新', priority_update: '优先级更新',
  deadline_update: '截止日更新', reassign: '转交',
}
function actionLabel(a) { return actionMap[a] || a || '-' }
function actionTagType(a) {
  const map = { create: 'success', update: '', delete: 'danger', assign: 'warning', advance: 'primary', remark: 'info', review: 'success', confirm: 'success' }
  return map[a] || ''
}

const logStats = computed(() => [
  { label: '总操作数', count: total.value, color: '#2563eb' },
  { label: '今日操作', count: list.value.filter(l => l.created_at?.startsWith(new Date().toISOString().split('T')[0])).length, color: '#16a34a' },
  { label: '删除操作', count: list.value.filter(l => l.action === 'delete').length, color: '#dc2626' },
  { label: '派单操作', count: list.value.filter(l => l.action === 'assign').length, color: '#ea580c' },
])

async function loadLogs() {
  loading.value = true
  try {
    const params = { page: page.value, limit: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (filterAction.value) params.action = filterAction.value
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await api.get('/work-orders', { params })
    const payload = res.data || {}
    const orders = Array.isArray(payload) ? payload : (payload.list || [])
    // 工单列表包含了日志信息（部分后端实现）
    // 如果没有专门的日志 API，从各工单收集
    list.value = []
    total.value = 0

    // 尝试获取全局日志（如果后端有 /admin/logs 接口）
    try {
      const logRes = await api.get('/admin/logs', { params: { page: page.value, limit: pageSize.value, ...params } })
      const logPayload = logRes.data || {}
      list.value = logPayload.list || logPayload || []
      total.value = logPayload.total || 0
    } catch {
      // fallback: 从工单列表中提取最近日志
      for (const wo of orders.slice(0, 20)) {
        try {
          const logRes = await api.get(`/work-orders/${wo.id}/logs`)
          const logs = (logRes.data || []).map(l => ({
            ...l,
            work_order_id: wo.id,
            work_order_no: wo.work_order_no,
          }))
          list.value.push(...logs)
        } catch { }
      }
      total.value = list.value.length
    }
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function exportLogs() {
  if (!list.value.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(list.value, [
    { key: 'work_order_no', label: '工单号' },
    { key: 'action', label: '操作类型', map: row => actionLabel(row.action) },
    { key: 'content', label: '操作内容' },
    { key: 'operator_name', label: '操作人' },
    { key: 'created_at', label: '操作时间' },
  ], '操作日志')
  ElMessage.success(`已导出 ${list.value.length} 条日志`)
}

onMounted(() => loadLogs())
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.page-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.mb-20 { margin-bottom: var(--space-5); }

.stat-card { text-align: center; padding: var(--space-4) 0; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: var(--space-1); }

.log-content { white-space: pre-wrap; word-break: break-all; font-size: var(--font-size-xs); }
</style>
