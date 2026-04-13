<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">施工管理</h1>
      <div>
        <el-button @click="fetchList" :icon="Refresh" circle title="刷新" />
      </div>
    </div>

    <!-- 筛选 -->
    <el-card class="mb-20">
      <el-form :inline="true">
        <el-form-item>
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:130px" @change="fetchList">
            <el-option v-for="(label, val) in STATUS_MAP" :key="val" :label="label" :value="val" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filters.keyword" placeholder="搜索工单号/项目" clearable style="width:200px" @change="fetchList" />
        </el-form-item>
        <el-form-item>
          <el-button @click="fetchList">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-20">
      <el-col :span="6" v-for="stat in statsCards" :key="stat.label">
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
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="workOrder.work_order_no" label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/work-orders/${row.work_order_id}`" class="wo-link">{{ row.workOrder?.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column label="项目名称" min-width="150">
          <template #default="{ row }">{{ row.workOrder?.title }}</template>
        </el-table-column>
        <el-table-column label="施工员" width="120">
          <template #default="{ row }">{{ row.constructor?.real_name || row.constructor_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="施工日期" width="120">
          <template #default="{ row }">{{ row.constructed_at || '-' }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="80">
          <template #default="{ row }">{{ row.duration_minutes ? row.duration_minutes + 'min' : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'completed'" size="small" type="success" @click="openVerifyDialog(row)">验收</el-button>
            <el-button v-if="row.status === 'scheduled'" size="small" type="warning" @click="startConstruction(row)">开始</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 验收对话框 -->
    <el-dialog v-model="showVerifyDialog" title="施工验收" width="520px">
      <el-descriptions :column="1" border class="mb-16">
        <el-descriptions-item label="工单号">{{ verifyTask.workOrder?.work_order_no }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ verifyTask.workOrder?.title }}</el-descriptions-item>
      </el-descriptions>
      <el-form :model="verifyForm" label-width="100px">
        <el-form-item label="验收结果" required>
          <el-radio-group v-model="verifyForm.result">
            <el-radio :label="true">通过</el-radio>
            <el-radio :label="false">不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验收说明">
          <el-input v-model="verifyForm.notes" type="textarea" :rows="3" placeholder="填写验收意见或整改要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showVerifyDialog = false">取消</el-button>
        <el-button :type="verifyForm.result ? 'success' : 'danger'" @click="submitVerify" :loading="submitting">
          {{ verifyForm.result ? '确认通过' : '退回整改' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const submitting = ref(false)

const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const filters = reactive({ status: '', keyword: '' })

const STATUS_MAP = {
  scheduled: '待施工', installing: '施工中', completed: '已完成',
  internally_verified: '内部验收通过', accepted: '甲方已验收',
  rejected: '退回整改',
}
function statusLabel(s) { return STATUS_MAP[s] || s }
function statusType(s) {
  const map = { scheduled: 'info', installing: 'warning', completed: 'primary', internally_verified: 'success', accepted: 'success', rejected: 'danger' }
  return map[s] || ''
}

// 统计
const statsCards = reactive([])

async function fetchList() {
  loading.value = true
  try {
    const params = { ...filters, page: pagination.page, limit: pagination.pageSize }
    const res = await api.get('/construction/tasks', { params })
    const payload = res.data || {}
    list.value = payload.list || payload || []
    pagination.total = payload.total || 0
    // 统计
    computeStats()
  } catch {
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function computeStats() {
  const all = list.value.length ? list.value : []
  const counts = { scheduled: 0, installing: 0, completed: 0, accepted: 0 }
  all.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++ })
  statsCards.length = 0
  statsCards.push(
    { label: '待施工', count: counts.scheduled, color: '#909399' },
    { label: '施工中', count: counts.installing, color: '#e6a23c' },
    { label: '已完成', count: counts.completed, color: '#409eff' },
    { label: '已验收', count: counts.accepted, color: '#67c23a' },
  )
}

function viewDetail(row) {
  router.push(`/construction/${row.work_order_id}`)
}

// 开始施工
async function startConstruction(row) {
  try {
    await ElMessageBox.confirm('确认开始施工？', '提示', { type: 'warning' })
    await api.post(`/construction/${row.work_order_id}`, {
      status: 'installing',
    })
    ElMessage.success('已开始施工')
    await fetchList()
  } catch {}
}

// 验收
const showVerifyDialog = ref(false)
const verifyTask = reactive({ workOrder: {} })
const verifyForm = reactive({ result: true, notes: '' })

function openVerifyDialog(row) {
  verifyTask.workOrder = row.workOrder || {}
  verifyTask.id = row.id
  verifyTask.work_order_id = row.work_order_id
  verifyForm.result = true
  verifyForm.notes = ''
  showVerifyDialog.value = true
}

async function submitVerify() {
  submitting.value = true
  try {
    const endpoint = verifyForm.result
      ? `/construction/${verifyTask.work_order_id}/internal-verify`
      : `/construction/${verifyTask.work_order_id}/internal-verify`
    await api.post(endpoint, {
      verified: verifyForm.result,
      notes: verifyForm.notes,
    })
    ElMessage.success(verifyForm.result ? '验收通过' : '已退回整改')
    showVerifyDialog.value = false
    await fetchList()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-16 { margin-bottom: var(--space-4); }
.mb-20 { margin-bottom: var(--space-5); }
.stat-card .stat-body { text-align: center; padding: var(--space-2) 0; }
.stat-number { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.pagination-box { display: flex; justify-content: flex-end; margin-top: var(--space-4); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
</style>
