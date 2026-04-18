<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">我的申报</h1>
      <router-link to="/new-declaration">
        <el-button type="primary">+ 新建申报</el-button>
      </router-link>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:130px" @change="loadData">
        <el-option label="草稿" value="draft" />
        <el-option label="审批中" value="pending_approval" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
        <el-option label="流转中" value="in_progress" />
        <el-option label="已完成" value="completed" />
        <el-option label="已归档" value="archived" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期"
        end-placeholder="结束日期" style="width:240px" @change="loadData" />
      <el-input v-model="keyword" placeholder="搜索项目名称/工单号" clearable style="width:200px" @change="loadData" />
    </div>

    <el-table :data="list" stripe>
      <el-table-column label="工单号" width="160">
        <template #default="{ row }">
          <router-link :to="`/declarations/${row.id}`" class="link">{{ row.work_order?.work_order_no }}</router-link>
        </template>
      </el-table-column>
      <el-table-column label="项目名称" min-width="200">
        <template #default="{ row }">{{ row.work_order?.title }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.work_order?.status)" size="small">{{ statusText(row.work_order?.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="当前环节" width="100">
        <template #default="{ row }">{{ stageText(row.work_order?.current_stage) }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <router-link :to="`/declarations/${row.id}`">
            <el-button size="small" type="primary">查看</el-button>
          </router-link>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const statusFilter = ref('')
const dateRange = ref(null)
const keyword = ref('')
const list = ref([])

onMounted(() => loadData())

async function loadData() {
  try {
    const res = await api.get('/declarations', { params: { status: statusFilter.value, keyword: keyword.value } })
    list.value = res.data || []
  } catch {
    list.value = []
  }
}

function statusType(s) {
  const map = { draft: 'info', pending_approval: 'warning', in_progress: '', approved: 'success', completed: 'info', rejected: 'danger', archived: 'info' }
  return map[s] || 'info'
}
function statusText(s) {
  const map = { draft: '草稿', pending_approval: '审批中', in_progress: '流转中', approved: '已通过', completed: '已完成', rejected: '已驳回', archived: '已归档' }
  return map[s] || s || '-'
}
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}
function stageText(s) {
  const map = { declaration: '申报', approval: '审批', assignment: '派单', measurement: '测量', design: '设计', production: '生产', construction: '施工', finance: '结算', archive: '归档' }
  return map[s] || s || '-'
}
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.link { color: #67c23a; text-decoration: none; font-family: monospace; }
</style>
