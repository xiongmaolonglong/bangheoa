<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">生产管理</h1>
      <div>
        <el-button @click="fetchTasks" :icon="Refresh" circle title="刷新" />
        <el-button type="primary" @click="openMergeDialog">+ 合并创建生产任务</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card class="mb-20">
      <el-form :inline="true">
        <el-form-item>
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:120px" @change="fetchTasks">
            <el-option v-for="(label, val) in STATUS_MAP" :key="val" :label="label" :value="val" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="filters.material_type" placeholder="材料类型" clearable style="width:140px" @change="fetchTasks" />
        </el-form-item>
        <el-form-item>
          <el-button @click="fetchTasks">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 任务列表 -->
    <el-card>
      <el-table :data="tasks" stripe v-loading="loading">
        <el-table-column prop="production_task_no" label="任务编号" width="170" />
        <el-table-column prop="material_type" label="材料" width="120" />
        <el-table-column prop="spec" label="规格" width="80" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="关联工单" min-width="180">
          <template #default="{ row }">
            <template v-if="row.workOrder">
              <router-link :to="`/work-orders/${row.workOrder.id}`" class="wo-link">{{ row.workOrder.work_order_no }}</router-link>
              <span class="ml-8 text-muted">{{ row.workOrder.title }}</span>
            </template>
            <template v-else-if="row.task_ids?.length">
              <span class="text-muted">关联 {{ row.task_ids.length }} 个工单</span>
            </template>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="质检结果" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.quality_result" :type="qualityTag(row.quality_result)" size="small">
              {{ row.quality_result }}
            </el-tag>
            <span v-else class="text-muted">未检</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag size="small">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="生产进度" width="200">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress :percentage="getProgressPct(row)" :status="getProgressStatus(row)" :stroke-width="14" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-button size="small" @click="openStatusDialog(row)">更新进度</el-button>
            <el-button size="small" type="warning" @click="openQualityDialog(row)" v-if="!row.quality_result && row.status !== 'scheduled'">质检</el-button>
            <el-button size="small" type="info" @click="viewTaskDetail(row)">详情</el-button>
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
          @current-change="fetchTasks"
          @size-change="fetchTasks"
        />
      </div>
    </el-card>

    <!-- 合并创建对话框 -->
    <el-dialog v-model="showMerge" title="合并创建生产任务" width="600px">
      <el-form :model="mergeForm" label-width="100px">
        <el-form-item label="选择工单" required>
          <el-select v-model="mergeForm.work_order_ids" multiple filterable placeholder="选择要合并的工单" style="width:100%">
            <el-option v-for="wo in availableWorkOrders" :key="wo.id" :label="`${wo.work_order_no} - ${wo.title}`" :value="wo.id" />
          </el-select>
          <div class="text-muted mt-4">已选 {{ mergeForm.work_order_ids.length }} 个工单</div>
        </el-form-item>
        <el-form-item label="材料类型" required>
          <el-input v-model="mergeForm.material_type" placeholder="例如：铝塑板" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="mergeForm.spec" placeholder="例如：3mm" />
        </el-form-item>
        <el-form-item label="总数量" required>
          <el-input-number v-model="mergeForm.quantity" :min="1" :precision="0" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMerge = false">取消</el-button>
        <el-button type="primary" @click="handleMerge" :loading="submitting">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 更新进度对话框 -->
    <el-dialog v-model="showStatusDialog" title="更新生产状态" width="480px">
      <el-descriptions :column="1" border class="mb-16">
        <el-descriptions-item label="任务编号">{{ currentTask.production_task_no }}</el-descriptions-item>
        <el-descriptions-item label="材料">{{ currentTask.material_type }}</el-descriptions-item>
        <el-descriptions-item label="当前状态"><el-tag size="small">{{ statusLabel(currentTask.status) }}</el-tag></el-descriptions-item>
      </el-descriptions>
      <el-form label-width="80px">
        <el-form-item label="目标状态" required>
          <el-select v-model="newStatus" style="width:100%">
            <el-option label="已排产" value="scheduled" />
            <el-option label="生产中" value="producing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已发货" value="shipped" />
            <el-option label="质检中" value="quality_checked" />
            <el-option label="质检合格" value="qualified" />
            <el-option label="已入库" value="warehoused" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="statusNotes" type="textarea" :rows="2" placeholder="可选，填写备注或质检说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateStatus" :loading="submitting">确认更新</el-button>
      </template>
    </el-dialog>

    <!-- 质检对话框 -->
    <el-dialog v-model="showQualityDialog" title="质量检验" width="520px">
      <el-descriptions :column="1" border class="mb-16">
        <el-descriptions-item label="任务编号">{{ qualityTask.production_task_no }}</el-descriptions-item>
        <el-descriptions-item label="材料">{{ qualityTask.material_type }} / {{ qualityTask.spec || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-form :model="qualityForm" label-width="100px">
        <el-form-item label="质检结果" required>
          <el-radio-group v-model="qualityForm.result">
            <el-radio label="合格">合格</el-radio>
            <el-radio label="不合格">不合格</el-radio>
            <el-radio label="待复检">待复检</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="检验员">
          <el-input v-model="qualityForm.inspector" placeholder="检验员姓名" />
        </el-form-item>
        <el-form-item label="检验日期">
          <el-date-picker v-model="qualityForm.check_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="检验说明">
          <el-input v-model="qualityForm.notes" type="textarea" :rows="3" placeholder="填写检验详情和备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQualityDialog = false">取消</el-button>
        <el-button type="primary" @click="submitQuality" :loading="submitting">提交质检</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情抽屉 -->
    <el-drawer v-model="showDetail" title="生产任务详情" size="520px">
      <template v-if="detailTask.id">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务编号">{{ detailTask.production_task_no }}</el-descriptions-item>
          <el-descriptions-item label="材料类型">{{ detailTask.material_type }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ detailTask.spec || '—' }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ detailTask.quantity }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag size="small">{{ statusLabel(detailTask.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="质检结果">{{ detailTask.quality_result || '—' }}</el-descriptions-item>
          <el-descriptions-item label="质检说明">{{ detailTask.quality_notes || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailTask.created_at }}</el-descriptions-item>
        </el-descriptions>
        <!-- 生产进度 -->
        <div class="mt-16">
          <h4 class="section-title">生产进度</h4>
          <div v-for="step in progressSteps" :key="step.id" class="progress-step">
            <div class="step-header">
              <span class="step-name">{{ step.step_name }}</span>
              <el-input-number v-model="step.progress_pct" :min="0" :max="100" size="small"
                :controls="false" style="width:70px" @change="saveProgress" />
              <span class="step-pct">{{ step.progress_pct }}%</span>
            </div>
            <el-progress :percentage="step.progress_pct" :stroke-width="8" />
          </div>
        </div>
        <div v-if="detailTask.workOrder" class="mt-16">
          <h4 class="section-title">关联工单</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="工单号">
              <router-link :to="`/work-orders/${detailTask.workOrder.id}`" class="wo-link">{{ detailTask.workOrder.work_order_no }}</router-link>
            </el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ detailTask.workOrder.title }}</el-descriptions-item>
            <el-descriptions-item label="当前环节">{{ detailTask.workOrder.current_stage }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'

const tasks = ref([])
const loading = ref(false)
const submitting = ref(false)
const showMerge = ref(false)
const showStatusDialog = ref(false)
const showQualityDialog = ref(false)
const showDetail = ref(false)

const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const filters = reactive({ status: '', material_type: '' })

// 可用工单（用于合并创建）
const availableWorkOrders = ref([])

const STATUS_MAP = {
  scheduled: '已排产', producing: '生产中', completed: '已完成',
  shipped: '已发货', quality_checked: '质检中', qualified: '质检合格',
  warehoused: '已入库',
}
function statusLabel(s) { return STATUS_MAP[s] || s }
function qualityTag(r) { return r === '合格' ? 'success' : r === '不合格' ? 'danger' : 'warning' }

// 合并创建
const mergeForm = reactive({ work_order_ids: [], material_type: '', spec: '', quantity: 1 })

async function openMergeDialog() {
  // 加载设计环节和生产的工单供选择
  try {
    const res = await api.get('/work-orders', {
      params: { stage: 'design', limit: 100 }
    })
    const designOrders = res.data?.list || res.data || []
    // 也加载当前生产环节的
    const prodRes = await api.get('/work-orders', {
      params: { stage: 'production', limit: 100 }
    })
    const prodOrders = prodRes.data?.list || prodRes.data || []
    availableWorkOrders.value = [...designOrders, ...prodOrders]
  } catch {
    availableWorkOrders.value = []
  }
  mergeForm.work_order_ids = []
  mergeForm.material_type = ''
  mergeForm.spec = ''
  mergeForm.quantity = 1
  showMerge.value = true
}

async function handleMerge() {
  if (!mergeForm.work_order_ids.length) return ElMessage.warning('请选择至少一个工单')
  if (!mergeForm.material_type) return ElMessage.warning('材料类型不能为空')
  if (!mergeForm.quantity) return ElMessage.warning('数量不能为零')
  submitting.value = true
  try {
    await api.post('/production/tasks/merge', {
      work_order_ids: mergeForm.work_order_ids,
      material_type: mergeForm.material_type,
      spec: mergeForm.spec,
      quantity: mergeForm.quantity,
    })
    ElMessage.success('生产任务创建成功')
    showMerge.value = false
    await fetchTasks()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '创建失败')
  } finally {
    submitting.value = false
  }
}

// 更新状态
const currentTask = reactive({ id: '', production_task_no: '', material_type: '', spec: '', status: '' })
const newStatus = ref('')
const statusNotes = ref('')

function openStatusDialog(row) {
  currentTask.id = row.id
  currentTask.production_task_no = row.production_task_no
  currentTask.material_type = row.material_type
  currentTask.spec = row.spec
  currentTask.status = row.status
  newStatus.value = row.status
  statusNotes.value = row.quality_notes || ''
  showStatusDialog.value = true
}

async function handleUpdateStatus() {
  if (!newStatus.value) return ElMessage.warning('请选择状态')
  submitting.value = true
  try {
    await api.post(`/production/tasks/${currentTask.id}/status`, {
      status: newStatus.value,
      notes: statusNotes.value,
    })
    ElMessage.success('状态已更新')
    showStatusDialog.value = false
    await fetchTasks()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新失败')
  } finally {
    submitting.value = false
  }
}

// 质检
const qualityTask = reactive({ id: '', production_task_no: '', material_type: '', spec: '' })
const qualityForm = reactive({ result: '', inspector: '', check_date: '', notes: '' })

function openQualityDialog(row) {
  qualityTask.id = row.id
  qualityTask.production_task_no = row.production_task_no
  qualityTask.material_type = row.material_type
  qualityTask.spec = row.spec
  qualityForm.result = '合格'
  qualityForm.inspector = ''
  qualityForm.check_date = new Date().toISOString().split('T')[0]
  qualityForm.notes = ''
  showQualityDialog.value = true
}

async function submitQuality() {
  if (!qualityForm.result) return ElMessage.warning('请选择质检结果')
  submitting.value = true
  try {
    await api.post(`/production/tasks/${qualityTask.id}/status`, {
      status: qualityForm.result === '合格' ? 'qualified' : 'quality_checked',
      notes: `质检${qualityForm.result}，检验员：${qualityForm.inspector || '未填写'}，说明：${qualityForm.notes}`,
      quality_result: qualityForm.result,
      quality_inspector: qualityForm.inspector,
      quality_date: qualityForm.check_date,
      quality_notes: qualityForm.notes,
    })
    ElMessage.success('质检记录已提交')
    showQualityDialog.value = false
    await fetchTasks()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  } finally {
    submitting.value = false
  }
}

// 详情
const detailTask = ref({})

function viewTaskDetail(row) {
  detailTask.value = row
  showDetail.value = true
  // 加载生产进度
  loadProgress(row.work_order_id || row.id)
}

// 生产进度
const progressSteps = ref([])

async function loadProgress(workOrderId) {
  if (!workOrderId) return
  try {
    const res = await api.get(`/production/${workOrderId}/progress`)
    progressSteps.value = res.data || []
  } catch (e) {
    console.error('加载进度失败:', e)
    progressSteps.value = []
  }
}

async function saveProgress() {
  if (!detailTask.value.work_order_id) return
  try {
    const updates = progressSteps.value.map(s => ({
      step_id: s.id,
      progress_pct: Math.min(100, Math.max(0, s.progress_pct)),
    }))
    await api.put(`/production/${detailTask.value.work_order_id}/progress`, { steps: updates })
  } catch (e) {
    console.error('保存进度失败:', e)
  }
}

function getProgressPct(row) {
  // 如果有进度数据，取平均值
  if (row.progress_steps?.length) {
    const steps = row.progress_steps
    const total = steps.reduce((s, step) => s + (step.progress_pct || 0), 0)
    return Math.round(total / steps.length)
  }
  // 根据状态估算
  const statusPct = { scheduled: 0, producing: 50, completed: 100, shipped: 100, quality_checked: 90, qualified: 95, warehoused: 100 }
  return statusPct[row.status] || 0
}

function getProgressStatus(row) {
  const pct = getProgressPct(row)
  if (pct >= 100) return 'success'
  if (pct >= 50) return ''
  return 'exception'
}

async function fetchTasks() {
  loading.value = true
  try {
    const params = { ...filters, page: pagination.page, limit: pagination.pageSize }
    const res = await api.get('/production/tasks', { params })
    const payload = res.data || {}
    tasks.value = payload.list || payload || []
    pagination.total = payload.total || 0
  } catch {
    tasks.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchTasks)
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-16 { margin-bottom: var(--space-4); }
.mb-20 { margin-bottom: var(--space-5); }
.mt-16 { margin-top: var(--space-4); }
.mt-4 { margin-top: var(--space-1); }
.ml-8 { margin-left: var(--space-2); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.pagination-box { display: flex; justify-content: flex-end; margin-top: var(--space-4); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
.progress-cell { padding: 4px 0; }
.progress-step { margin-bottom: 16px; }
.step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.step-name { font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); min-width: 60px; }
.step-pct { font-size: var(--font-size-xs); color: var(--color-text-tertiary); min-width: 36px; text-align: right; }
</style>
