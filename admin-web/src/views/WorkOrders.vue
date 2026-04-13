<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">工单管理</h1>
      <div class="page-actions">
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-button :type="viewMode === 'list' ? '' : 'primary'" @click="viewMode = viewMode === 'kanban' ? 'list' : 'kanban'">
          {{ viewMode === 'kanban' ? '列表视图' : '看板视图' }}
        </el-button>
        <el-button type="primary" @click="showCreate = true">
          <el-icon><Plus /></el-icon>补录工单
        </el-button>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-if="viewMode === 'kanban'" class="kanban-wrap">
      <div v-for="col in kanbanCols" :key="col.key" class="kanban-col">
        <div class="kanban-header">
          <span class="col-title">{{ col.label }}</span>
          <span class="col-count">{{ col.items?.length || 0 }}</span>
        </div>
        <div class="kanban-body" @dragover.prevent @drop="onDropOnCol($event, col.key)">
          <el-badge v-for="wo in col.items" :key="wo.id" :is-dot="wo.is_timeout" dot-class="timeout-dot" :offset="[-2, 2]">
            <el-card shadow="hover" class="kanban-card"
              :class="{ 'kanban-card-timeout': wo.is_timeout }"
              draggable="true"
              @dragstart="onDragStart($event, wo)"
              @click="$router.push(`/work-orders/${wo.id}`)">
              <div class="card-tags">
                <el-tag size="small" type="primary" effect="plain">{{ wo.client_name }}</el-tag>
                <el-tag v-if="wo.project_category" size="small" effect="plain">{{ categoryLabel(wo.project_category) }}</el-tag>
                <el-tag v-if="wo.is_timeout" size="small" type="danger">超时</el-tag>
              </div>
              <div class="card-title">{{ wo.title }}</div>
              <div class="card-meta">
                <span>{{ wo.assigned_to || '未分配' }}</span>
                <span>{{ wo.deadline || '无截止' }}</span>
              </div>
              <div class="card-actions">
                <el-button v-if="wo.current_stage === 'assignment'" link type="primary" size="small"
                  @click.stop="$router.push(`/work-orders/${wo.id}`)">派单</el-button>
                <el-button v-if="wo.current_stage === 'measurement'" link type="warning" size="small"
                  @click.stop="openProxyMeasure(wo)">代录</el-button>
                <el-button v-if="wo.current_stage === 'measurement' && wo.measurement" link type="success" size="small"
                  @click.stop="$router.push(`/work-orders/${wo.id}/measure-review`)">审核</el-button>
                <el-button v-if="wo.current_stage === 'design'" link type="primary" size="small"
                  @click.stop="$router.push('/designs')">设计</el-button>
                <el-button v-if="wo.current_stage === 'production'" link type="primary" size="small"
                  @click.stop="$router.push('/production')">生产</el-button>
                <el-button v-if="wo.current_stage === 'construction'" link type="primary" size="small"
                  @click.stop="$router.push('/construction')">施工</el-button>
              </div>
            </el-card>
          </el-badge>
          <el-empty v-if="!col.items?.length" :image-size="40" description="暂无工单" />
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <!-- Stats Panel -->
      <StatsPanel />

      <!-- Filters -->
      <el-card class="filter-card">
        <el-form :inline="true" :model="filters">
          <el-form-item>
            <el-input v-model="filters.keyword" placeholder="搜索工单号/甲方/地址" clearable style="width:240px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.stage" placeholder="全部环节" clearable style="width:120px">
              <el-option label="申报接收" value="declaration" />
              <el-option label="待派单" value="assignment" />
              <el-option label="测量中" value="measurement" />
              <el-option label="设计中" value="design" />
              <el-option label="生产中" value="production" />
              <el-option label="施工中" value="construction" />
              <el-option label="费用" value="finance" />
              <el-option label="归档" value="archive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:100px">
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.client_id" placeholder="全部甲方" clearable style="width:140px">
              <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.project_category" placeholder="全部分类" clearable style="width:120px">
              <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.assigned_to" placeholder="全部负责人" clearable style="width:120px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
              start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:240px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWorkOrders">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
            <el-button @click="exportExcel"><el-icon><Download /></el-icon>导出 Excel</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Table -->
      <el-card>
        <el-table ref="tableRef" :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="client_name" label="甲方企业" width="140" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ categoryLabel(row.project_category) || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前环节" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="stageTagType(row.current_stage)">{{ stageLabel(row.current_stage) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.is_timeout ? 'danger' : 'success'" effect="plain">
                {{ row.is_timeout ? '超时' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assigned_to" label="负责人" width="90" />
          <el-table-column prop="deadline" label="截止日期" width="110" />
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="action-link">查看</router-link>
              <el-button v-if="row.current_stage === 'assignment'" link type="primary" @click="openDispatch(row)">派单</el-button>
              <el-button v-if="row.current_stage === 'measurement'" link type="warning" @click="openProxyMeasure(row)">代录</el-button>
              <el-button v-if="row.current_stage === 'assignment' && !row.assigned_tenant_user_id" link type="primary" @click.stop="openEdit(row)">编辑</el-button>
              <el-button v-if="row.current_stage === 'assignment' && !row.assigned_tenant_user_id" link type="danger" @click.stop="deleteWorkOrder(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Batch selection bar -->
        <div v-if="selectedRows.length" class="batch-bar">
          <span>已选 {{ selectedRows.length }} 项</span>
          <el-button size="small" type="primary" @click="showBatchOps = true">批量操作</el-button>
          <el-button size="small" @click="clearSelection">取消选择</el-button>
        </div>

        <div class="pagination-wrap">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
            :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
            @size-change="loadWorkOrders" @current-change="loadWorkOrders" />
        </div>
      </el-card>
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreate" title="补录工单" width="520px">
      <el-form ref="createFormRef" :model="createForm" :rules="createFormRules" label-width="80px">
        <el-form-item label="甲方企业" prop="client_id">
          <el-select v-model="createForm.client_id" placeholder="请选择" style="width:100%">
            <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称" prop="title">
          <el-input v-model="createForm.title" placeholder="例如：XX门店招牌" />
        </el-form-item>
        <el-form-item label="项目类型">
          <el-select v-model="createForm.project_type" style="width:100%">
            <el-option label="门头招牌" value="signboard" />
            <el-option label="室内广告" value="indoor" />
            <el-option label="灯箱" value="lightbox" />
            <el-option label="LED显示屏" value="led" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目分类">
          <el-select v-model="createForm.project_category" style="width:100%">
            <el-option label="日常" value="daily" />
            <el-option label="门头招牌" value="storefront" />
            <el-option label="室内广告" value="indoor_ad" />
            <el-option label="LED大屏" value="led_screen" />
            <el-option label="520" value="520" />
            <el-option label="国庆" value="national_day" />
            <el-option label="春节" value="spring_festival" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目地址">
          <el-input v-model="createForm.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请描述项目需求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="createWorkOrder" :loading="creating">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 代录测量数据对话框 -->
    <el-dialog v-model="showProxy" title="代录测量数据" width="600px">
      <el-form :model="proxyForm" label-width="100px" v-loading="proxyLoading">
        <template v-if="proxyLoaded && proxyFields.length">
          <el-form-item
            v-for="field in proxyFields"
            :key="field.field_key"
            :label="field.field_label"
            :required="field.required"
          >
            <el-input
              v-if="field.field_type === 'text'"
              v-model="proxyForm[field.field_key]"
              :placeholder="field.placeholder || '请输入'"
            />
            <el-input
              v-else-if="field.field_type === 'textarea'"
              v-model="proxyForm[field.field_key]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || '请输入'"
            />
            <el-input-number
              v-else-if="field.field_type === 'number'"
              v-model="proxyForm[field.field_key]"
              :min="0"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.field_type === 'date'"
              v-model="proxyForm[field.field_key]"
              type="date"
              :placeholder="field.placeholder || '请选择日期'"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-else-if="field.field_type === 'select'"
              v-model="proxyForm[field.field_key]"
              :placeholder="field.placeholder || '请选择'"
              style="width: 100%"
            >
              <el-option v-for="opt in (field.options || [])" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-upload
              v-else-if="field.field_type === 'image'"
              action="/api/v1/files/upload"
              list-type="picture-card"
              :file-list="proxyForm[field.field_key] || []"
              :on-success="(res) => proxyFileSuccess(res, field.field_key)"
              :headers="proxyUploadHeaders"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <el-input v-else v-model="proxyForm[field.field_key]" :placeholder="field.placeholder || '请输入'" />
          </el-form-item>
        </template>
        <el-empty v-else-if="proxyLoaded" description="未配置测量表单字段，请先到系统配置页面配置" />
        <el-skeleton v-else :rows="5" animated />
      </el-form>
      <template #footer>
        <el-button @click="showProxy = false">取消</el-button>
        <el-button type="primary" @click="submitProxy" :loading="proxySubmitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- 批量操作对话框 -->
    <BatchOpsDialog v-model="showBatchOps" :count="selectedRows.length" :selections="selectedRows"
      :user-options="userOptions" @done="loadWorkOrders" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Download, Refresh } from '@element-plus/icons-vue'
import { exportWithTimestamp } from '../utils/export'
import { useAuthStore } from '../store/auth'
import api from '../api'
import BatchOpsDialog from '../components/BatchOpsDialog.vue'
import StatsPanel from '../components/StatsPanel.vue'

const router = useRouter()
const auth = useAuthStore()

const viewMode = ref('kanban')
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreate = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const clients = ref([])

const createFormRules = {
  client_id: [{ required: true, message: '请选择甲方企业', trigger: 'change' }],
  title: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const filters = reactive({ keyword: '', stage: '', status: '', client_id: '', project_category: '', assigned_to: '' })
const dateRange = ref(null)
const createForm = reactive({ client_id: '', title: '', project_type: 'signboard', project_category: 'daily', address: '', description: '' })

// 批量操作
const tableRef = ref(null)
const selectedRows = ref([])
const showBatchOps = ref(false)
const userOptions = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}
function clearSelection() {
  tableRef.value?.clearSelection()
}

async function loadUserOptions() {
  try {
    const res = await api.get('/tenants/users')
    const payload = res.data || {}
    userOptions.value = (Array.isArray(payload) ? payload : (payload.list || []))
      .filter(u => u.status === 'active')
  } catch (e) {
    console.error('加载人员列表失败:', e)
  }
}

// 代录测量
const showProxy = ref(false)
const proxyLoading = ref(false)
const proxyLoaded = ref(false)
const proxySubmitted = ref(false)
const proxyFields = ref([])
const proxyForm = reactive({})
const proxySubmitting = ref(false)

const proxyUploadHeaders = computed(() => ({
  Authorization: `Bearer ${auth.token}`
}))

const kanbanCols = ref([
  { key: 'declaration', label: '申报接收', items: [] },
  { key: 'assignment', label: '待派单', items: [] },
  { key: 'measurement', label: '测量中', items: [] },
  { key: 'design', label: '设计中', items: [] },
  { key: 'production', label: '生产中', items: [] },
  { key: 'construction', label: '待施工', items: [] }
])

const stageMap = {
  declaration: '申报接收', assignment: '待派单', measurement: '测量中',
  design: '设计中', production: '生产中', construction: '施工中',
  finance: '费用管理', archive: '归档', aftersale: '售后'
}
function stageLabel(s) { return stageMap[s] || s }
function stageTagType(s) {
  const map = { declaration: '', assignment: 'info', measurement: 'warning', design: 'primary', production: 'success' }
  return map[s] || 'info'
}

const categoryMap = {
  daily: '日常', '520': '520', national_day: '国庆', spring_festival: '春节',
  storefront: '门头招牌', led_screen: 'LED大屏', indoor_ad: '室内广告',
}
function categoryLabel(c) { return categoryMap[c] || c }

const PROJECT_CATEGORIES = [
  { label: '日常', value: 'daily' },
  { label: '门头招牌', value: 'storefront' },
  { label: '室内广告', value: 'indoor_ad' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '520', value: '520' },
  { label: '国庆', value: 'national_day' },
  { label: '春节', value: 'spring_festival' },
]

// 阶段推进（看板拖拽用）
const STAGE_ORDER = ['declaration', 'approval', 'assignment', 'measurement', 'design', 'production', 'construction', 'finance', 'archive']
const dragData = ref(null)

function onDragStart(e, wo) {
  dragData.value = wo
  e.dataTransfer.effectAllowed = 'move'
  e.stopPropagation()
}

async function onDropOnCol(e, targetStage) {
  e.preventDefault()
  if (!dragData.value) return
  const wo = dragData.value
  dragData.value = null

  if (wo.current_stage === targetStage) return

  const fromIdx = STAGE_ORDER.indexOf(wo.current_stage)
  const toIdx = STAGE_ORDER.indexOf(targetStage)
  if (toIdx <= fromIdx) {
    return ElMessage.warning('只能向后推进环节')
  }
  if (Math.abs(toIdx - fromIdx) > 2) {
    return ElMessage.warning('不能跨环节移动，请通过详情页面操作')
  }

  try {
    await api.put(`/work-orders/${wo.id}/stage`, { target_stage: targetStage })
    ElMessage.success('环节已更新')
    loadWorkOrders()
  } catch (err) {
    if (err.response) ElMessage.error(err.response.data?.error || '更新失败')
  }
}

async function loadWorkOrders() {
  loading.value = true
  try {
    const params = { ...filters, page: page.value, limit: pageSize.value }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await api.get('/work-orders', { params })
    const payload = res.data || {}
    if (Array.isArray(payload)) {
      tableData.value = payload
      total.value = (res.pagination?.total) || payload.length
    } else if (Array.isArray(payload.list)) {
      tableData.value = payload.list
      total.value = payload.total || 0
    } else {
      tableData.value = []
      total.value = 0
    }
    // Group by stage for kanban
    const allRes = await api.get('/work-orders', { params: { ...filters, limit: 200 } })
    const allPayload = allRes.data || {}
    const allList = Array.isArray(allPayload) ? allPayload : (allPayload.list || [])
    kanbanCols.value.forEach(col => {
      col.items = allList
        .filter(w => w.current_stage === col.key)
        .sort((a, b) => {
          if (a.is_timeout && !b.is_timeout) return -1
          if (!a.is_timeout && b.is_timeout) return 1
          return 0
        })
    })
  } catch {
    tableData.value = []
    total.value = 0
    kanbanCols.value.forEach(col => { col.items = [] })
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.stage = ''
  filters.status = ''
  filters.client_id = ''
  filters.project_category = ''
  filters.assigned_to = ''
  dateRange.value = null
  loadWorkOrders()
}

function openDispatch(row) {
  router.push('/dispatch')
}

// 编辑/删除
function openEdit(row) {
  router.push(`/work-orders/${row.id}`)
}

async function deleteWorkOrder(row) {
  try {
    await ElMessageBox.confirm(`确定删除工单「${row.work_order_no}」吗？`, '提示', { type: 'warning' })
    await api.delete(`/work-orders/${row.id}`)
    ElMessage.success('已删除')
    loadWorkOrders()
  } catch {}
}

const EXPORT_COLUMNS = [
  { key: 'work_order_no', label: '工单号' },
  { key: 'title', label: '项目名称' },
  { key: 'client_name', label: '甲方企业' },
  { key: 'current_stage', label: '当前环节' },
  { key: 'assigned_to', label: '负责人' },
  { key: 'deadline', label: '截止日期' },
  { key: 'created_at', label: '创建日期' },
]

function exportExcel() {
  const data = viewMode.value === 'kanban'
    ? kanbanCols.value.flatMap(c => c.items || [])
    : tableData.value
  if (!data.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(data, EXPORT_COLUMNS, '工单列表')
  ElMessage.success(`已导出 ${data.length} 条数据`)
}

async function createWorkOrder() {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return
  creating.value = true
  try {
    await api.post('/work-orders', { ...createForm })
    ElMessage.success('创建成功')
    showCreate.value = false
    Object.keys(createForm).forEach(k => { createForm[k] = '' })
    createForm.project_type = 'signboard'
    createForm.project_category = 'daily'
    loadWorkOrders()
  } catch (e) {
    const msg = e.response?.data?.error || e.response?.data?.message || '创建失败'
    ElMessage.error(msg)
  } finally {
    creating.value = false
  }
}

let refreshTimer = null

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => loadWorkOrders(), 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

function handleRefresh() {
  loadWorkOrders()
  ElMessage.success('已刷新')
}

onMounted(() => {
  loadWorkOrders()
  loadProxyConfig()
  loadUserOptions()
  api.get('/clients').then(res => { clients.value = res.data?.list || res.data || [] }).catch(() => {})
  api.get('/clients/default').then(res => {
    if (res.code === 0 && res.data?.default_client_id) {
      createForm.client_id = res.data.default_client_id
    }
  }).catch(() => {})
  startAutoRefresh()
})

onUnmounted(() => stopAutoRefresh())

function openProxyMeasure(row) {
  proxySubmitted.value = row.id
  // Reset form
  Object.keys(proxyForm).forEach(k => delete proxyForm[k])
  proxyFields.value.forEach(f => {
    if (f.default_value !== undefined) proxyForm[f.field_key] = f.default_value
    else if (f.field_type === 'image') proxyForm[f.field_key] = []
  })
  showProxy.value = true
}

async function loadProxyConfig() {
  proxyLoading.value = true
  try {
    const res = await api.get('/tenant/form-config/measurement_data')
    if (res.code === 0 && res.data) {
      proxyFields.value = res.data.fields || []
      proxyFields.value.forEach(f => {
        if (f.default_value !== undefined) proxyForm[f.field_key] = f.default_value
        else if (f.field_type === 'image') proxyForm[f.field_key] = []
      })
    }
  } catch (err) {
    console.error('加载测量表单配置失败:', err)
  } finally {
    proxyLoading.value = false
    proxyLoaded.value = true
  }
}

function proxyFileSuccess(res, fieldKey) {
  if (!proxyForm[fieldKey]) proxyForm[fieldKey] = []
  proxyForm[fieldKey].push(res.data?.url || res.data)
}

async function submitProxy() {
  if (!proxySubmitted.value) return
  proxySubmitting.value = true
  try {
    await api.post(`/measurements/${proxySubmitted.value}/proxy-submit`, proxyForm)
    ElMessage.success('代录测量数据已提交')
    showProxy.value = false
    loadWorkOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  } finally {
    proxySubmitting.value = false
  }
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.page-actions { display: flex; gap: var(--space-2); }

.filter-card { margin-bottom: var(--space-4); }

.kanban-wrap { display: flex; gap: var(--space-3); overflow-x: auto; padding-bottom: var(--space-4); }
.kanban-col { min-width: 260px; flex: 1; }

.kanban-header {
  background: var(--color-bg-page);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-base) var(--radius-base) 0 0;
  border: 1px solid var(--color-border-light);
  border-bottom: 2px solid var(--color-border-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.col-title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.col-count {
  background: var(--color-border-light);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: 10px;
  font-weight: var(--font-weight-semibold);
}

.kanban-body {
  background: var(--color-bg-page);
  border-radius: 0 0 var(--radius-base) var(--radius-base);
  padding: var(--space-2);
  min-height: 200px;
  border: 1px solid var(--color-border-light);
  border-top: none;
}

.kanban-card { cursor: pointer; margin-bottom: var(--space-2); border: 1px solid var(--color-border-light); }
.kanban-card :deep(.el-card__body) { padding: var(--space-3); }

.card-tags { display: flex; gap: var(--space-1); margin-bottom: var(--space-2); flex-wrap: wrap; }
.card-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-primary); margin-bottom: var(--space-1); }
.card-meta { font-size: var(--font-size-xs); color: var(--color-text-tertiary); display: flex; justify-content: space-between; }

.action-link { color: var(--color-primary); cursor: pointer; margin-right: var(--space-2); }

.batch-bar {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: #e6f7ff; border-radius: var(--radius-sm);
  margin-bottom: var(--space-3); font-size: var(--font-size-xs);
}

.kanban-card-timeout { border-left: 3px solid #f5222d; }

.card-actions { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
.card-actions :deep(.el-button) { padding: 0 4px; font-size: 12px; }

:deep(.timeout-dot) { background: #f5222d; }

:deep(.el-pagination) {
  padding-top: var(--space-4);
}
</style>
