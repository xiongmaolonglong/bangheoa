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
        <el-button v-if="viewMode === 'kanban'" type="success" @click="exportKanbanExcel">
          <el-icon><Download /></el-icon>导出
        </el-button>
        <el-button v-if="viewMode === 'kanban'" @click="printKanban">
          <el-icon><Printer /></el-icon>打印
        </el-button>
        <el-button v-if="viewMode === 'kanban'" @click="showKanbanSettings = true">
          <el-icon><Setting /></el-icon>列设置
        </el-button>
        <el-button type="primary" @click="showCreate = true">
          <el-icon><Plus /></el-icon>补录工单
        </el-button>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-if="viewMode === 'kanban'">
      <StatsPanel />
      <el-card class="filter-card kanban-filter-bar">
        <el-form :inline="true">
          <el-form-item>
            <el-input v-model="kanbanSearch" placeholder="搜索工单号/甲方/项目名" clearable style="width:220px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterStage" placeholder="全部环节" clearable style="width:120px">
              <el-option v-for="c in KANBAN_COLUMNS" :key="c.key" :label="c.label" :value="c.key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterCategory" placeholder="全部分类" clearable style="width:120px">
              <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterActivity" placeholder="全部活动" clearable style="width:130px">
              <el-option v-for="a in activities" :key="a.value" :label="a.label" :value="a.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterStatus" placeholder="全部状态" clearable style="width:100px">
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
              <el-option label="即将到期" value="expiring" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="kanbanFilterAssignee" placeholder="全部负责人" clearable style="width:120px">
              <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWorkOrders">查询</el-button>
            <el-button @click="resetKanbanFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <div v-if="kanbanSelectedIds.length" class="batch-bar">
        <span>已选 {{ kanbanSelectedIds.length }} 项</span>
        <el-button size="small" type="primary" @click="kanbanBatchAction = 'advance'; showKanbanBatchDialog = true">批量推进</el-button>
        <el-button size="small" type="success" @click="kanbanBatchAction = 'dispatch'; showKanbanBatchDialog = true">批量派单</el-button>
        <el-button size="small" @click="clearKanbanSelection">取消选择</el-button>
      </div>

      <div class="kanban-wrap">
        <KanbanColumn
          v-for="col in visibleKanbanCols" :key="col.key"
          :col="col"
          :items="col.items"
          :ad-types="adTypes"
          :activities="activities"
          :is-drag-over="dragOverCol === col.key"
          @toggle="toggleCol"
          @card-contextmenu="openContextMenu"
          @card-dragstart="onDragStart"
          @card-remark="openRemarkDialog"
          @card-reassign="openReassignDialog"
          @dragover="onDragOverCol($event, col.key)"
          @dragleave="onDragLeaveCol($event, col.key)"
          @drop="onDropOnCol($event, col.key)"
        />
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <StatsPanel />
      <el-card class="filter-card">
        <el-form :inline="true" :model="filters">
          <el-form-item>
            <el-input v-model="filters.keyword" placeholder="搜索工单号/甲方/地址" clearable style="width:240px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.stage" placeholder="全部环节" clearable style="width:120px">
              <el-option v-for="s in stageOptions" :key="s.key" :label="s.label" :value="s.key" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:100px">
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.project_category" placeholder="全部分类" clearable style="width:120px">
              <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.activity_name" placeholder="全部活动" clearable style="width:130px">
              <el-option v-for="a in activities" :key="a.value" :label="a.label" :value="a.value" />
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

      <el-card>
        <el-table ref="tableRef" :data="tableData" stripe v-loading="loading" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="店铺名字" min-width="150" show-overflow-tooltip />
          <el-table-column label="地址" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.address || '-' }}</template>
          </el-table-column>
          <el-table-column label="元素" width="100">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ adTypeLabel(row.project_type) || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前环节" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="displayStageTagType(row)">{{ displayStageLabel(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="待派单" width="100">
            <template #default="{ row }">
              <el-tag v-if="getDispatchNeeded(row)" size="small" type="danger" effect="dark">{{ getDispatchNeeded(row) }}</el-tag>
              <span v-else class="text-muted">-</span>
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
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <div class="action-group">
                <router-link :to="`/work-orders/${row.id}`" class="action-link">
                  <el-icon><View /></el-icon>查看
                </router-link>
                                <template v-if="row.current_stage === 'assignment' && !row.assigned_tenant_user_id">
                  <el-button link type="info" size="small" @click.stop="openEdit(row)">
                    <el-icon><Edit /></el-icon>编辑
                  </el-button>
                </template>
                <el-button v-if="row.current_stage !== 'archive'" v-permission="'admin'" link type="danger" size="small" @click.stop="deleteWorkOrder(row)">
                  <el-icon><Delete /></el-icon>删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

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
    <CreateDialog v-model="showCreate" :clients="clients" @done="loadWorkOrders" />

    <!-- Batch Ops Dialog -->
    <BatchOpsDialog v-model="showBatchOps" :count="selectedRows.length" :selections="selectedRows"
      :user-options="userOptions" @done="loadWorkOrders" />

    <!-- Kanban Batch Dialog -->
    <el-dialog v-model="showKanbanBatchDialog" :title="kanbanBatchAction === 'advance' ? '批量推进环节' : '批量派单'" width="480px">
      <p style="margin-bottom: 12px">已选择 <strong>{{ kanbanSelectedIds.length }}</strong> 个工单</p>
      <el-form v-if="kanbanBatchAction === 'advance'" label-width="80px">
        <el-form-item label="目标环节">
          <el-select v-model="kanbanBatchTargetStage" placeholder="选择目标环节" style="width:100%">
            <el-option v-for="s in advanceStageOptions" :key="s.key" :label="s.label" :value="s.key" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-if="kanbanBatchAction === 'dispatch'" label-width="80px">
        <el-form-item label="负责人">
          <el-select v-model="kanbanBatchForm.assigned_to" placeholder="选择人员" style="width:100%">
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="kanbanBatchForm.deadline" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showKanbanBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="executeKanbanBatch" :loading="kanbanBatchExecuting">执行</el-button>
      </template>
    </el-dialog>

    <!-- Kanban Settings Dialog -->
    <el-dialog v-model="showKanbanSettings" title="看板列设置" width="420px">
      <el-alert title="拖拽可调整列顺序，开关可显示/隐藏列" type="info" :closable="false" show-icon style="margin-bottom: 16px" />
      <draggable v-model="allKanbanCols" item-key="key" :animation="200" handle=".drag-handle">
        <template #item="{ element }">
          <div class="col-setting-row">
            <el-icon class="drag-handle"><Rank /></el-icon>
            <span>{{ element.label }}</span>
            <el-switch v-model="element.visible" active-text="显示" />
          </div>
        </template>
      </draggable>
      <template #footer>
        <el-button @click="showKanbanSettings = false">关闭</el-button>
        <el-button type="primary" @click="saveKanbanSettings">保存</el-button>
      </template>
    </el-dialog>

    <!-- Context Menu -->
    <ContextMenu
      :visible="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :wo="contextMenu.wo"
      :is-admin="isAdmin"
      @action="contextAction"
      @close="closeContextMenu"
    />

    <!-- Dialogs -->
    <WorkOrderDialogs
      :wo-id="currentWoId"
      :wo="currentWo"
      :dialog-type="dialogType"
      :user-options="userOptions"
      @close="closeDialog"
      @refresh="loadWorkOrders"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Download, Refresh, Setting, Printer, View, Rank, Document, Edit, Delete } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { exportWithTimestamp } from '../utils/export'
import { useAuthStore } from '../store/auth'
import api from '../api'
import { logger } from '../utils/logger'
import StatsPanel from '../components/StatsPanel.vue'
import BatchOpsDialog from '../components/BatchOpsDialog.vue'
import KanbanColumn from '../components/workorder/KanbanColumn.vue'
import CreateDialog from '../components/workorder/CreateDialog.vue'
import ContextMenu from '../components/workorder/ContextMenu.vue'
import WorkOrderDialogs from '../components/workorder/WorkOrderDialogs.vue'

const router = useRouter()
const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'admin')

// View state
const viewMode = ref('list')
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreate = ref(false)
const clients = ref([])
const userOptions = ref([])

// Filters
const filters = reactive({ keyword: '', stage: '', status: '', project_category: '', activity_name: '', assigned_to: '' })
const dateRange = ref(null)

// Batch selection
const tableRef = ref(null)
const selectedRows = ref([])
const showBatchOps = ref(false)

// Kanban
const kanbanSearch = ref('')
const kanbanFilterStage = ref('')
const kanbanFilterCategory = ref('')
const kanbanFilterActivity = ref('')
const kanbanFilterStatus = ref('')
const kanbanFilterAssignee = ref('')

const KANBAN_COLUMNS = [
  { key: 'declaration', label: '申报接收' },
  { key: 'approval', label: '待审批' },
  { key: 'assignment', label: '待派单' },
  { key: 'measurement', label: '测量中' },
  { key: 'design', label: '设计中' },
  { key: 'production', label: '生产中' },
  { key: 'construction', label: '施工中' },
  { key: 'finance', label: '待财务' }
]

const stageOptions = [
  { key: 'declaration', label: '申报接收' },
  { key: 'assignment', label: '待派单' },
  { key: 'measurement', label: '测量中' },
  { key: 'design', label: '设计中' },
  { key: 'production', label: '生产中' },
  { key: 'construction', label: '施工中' },
  { key: 'finance', label: '费用' },
]

const PROJECT_CATEGORIES = [
  { label: '日常', value: 'daily' },
  { label: '门头招牌', value: 'storefront' },
  { label: '室内广告', value: 'indoor_ad' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '520', value: '520' },
  { label: '国庆', value: 'national_day' },
  { label: '春节', value: 'spring_festival' },
]

const allKanbanCols = ref(KANBAN_COLUMNS.map(c => ({ ...c, items: [], collapsed: false, visible: true })))
const visibleKanbanCols = computed(() => allKanbanCols.value.filter(c => c.visible))

const kanbanSelectedIds = computed(() => {
  const ids = []
  allKanbanCols.value.forEach(col => {
    col.items?.forEach(wo => { if (wo._selected) ids.push(wo.id) })
  })
  return ids
})

const showKanbanSettings = ref(false)
const showKanbanBatchDialog = ref(false)
const kanbanBatchAction = ref('advance')
const kanbanBatchTargetStage = ref('')
const kanbanBatchForm = reactive({ assigned_to: '', deadline: '' })
const kanbanBatchExecuting = ref(false)

const advanceStageOptions = computed(() => [
  { key: 'assignment', label: '待派单' },
  { key: 'measurement', label: '测量中' },
  { key: 'design', label: '设计中' },
  { key: 'production', label: '生产中' },
  { key: 'construction', label: '待施工' },
])

// Context menu
const contextMenu = reactive({ show: false, x: 0, y: 0, wo: null })
const currentWoId = ref(null)
const currentWo = ref(null)
const dialogType = ref('')

// Drag state
const dragData = ref(null)
const dragOverCol = ref(null)

const STAGE_ORDER = ['declaration', 'approval', 'assignment', 'measurement', 'design', 'production', 'construction', 'finance', 'archive']

// Dynamic data
const adTypes = ref([])
const activities = ref([])

// Stage labels
const stageMap = {
  declaration: '申报接收', assignment: '待派单', measurement: '测量中',
  design: '设计中', production: '生产中', construction: '施工中',
  finance: '费用管理', archive: '归档', aftersale: '售后'
}

function stageLabel(s) { return stageMap[s] || s }

function displayStageLabel(row) {
  if (row.current_stage === 'measurement') {
    if (row.measurement?.status === 'measured' || row.status === 'measured') return '待审核'
    if (row.measurement?.status === 'rejected') return '驳回重测'
    return stageLabel('measurement')
  }
  return stageLabel(row.current_stage)
}

function displayStageTagType(row) {
  if (row.current_stage === 'measurement') {
    if (row.measurement?.status === 'measured' || row.status === 'measured') return 'success'
    if (row.measurement?.status === 'rejected') return 'danger'
    return 'warning'
  }
  const map = { declaration: '', assignment: 'info', measurement: 'warning', design: 'primary', production: 'success' }
  return map[row.current_stage] || 'info'
}

// 判断工单是否需要派单
function getDispatchNeeded(row) {
  const stage = row.current_stage
  if (stage === 'assignment' && !row.assigned_tenant_user_id) return '待派测量'
  if ((stage === 'design' || stage === 'production') && !row.designer_id) return '待派设计'
  if (stage === 'construction' && !row.constructor_id) return '待派施工'
  return ''
}

function adTypeLabel(v) {
  const item = adTypes.value.find(t => t.value === v)
  return item ? item.label : v || ''
}

function daysToDeadline(wo) {
  if (!wo.deadline) return Infinity
  return Math.ceil((new Date(wo.deadline) - new Date()) / (1000 * 60 * 60 * 24))
}

// Load functions
async function loadWorkOrders() {
  loading.value = true
  try {
    const params = { ...filters, page: page.value, limit: viewMode.value === 'kanban' ? 200 : pageSize.value }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await api.get('/work-orders', { params })
    let allList = Array.isArray(res.data) ? res.data : (res.data?.list || [])
    allList = allList.filter(w => w.current_stage !== 'approval')

    if (viewMode.value !== 'kanban') {
      tableData.value = allList
      total.value = res.pagination?.total || allList.length
    } else {
      tableData.value = allList.slice(0, pageSize.value)
      total.value = res.pagination?.total || allList.length
    }

    // Apply kanban filters
    if (kanbanSearch.value) {
      const kw = kanbanSearch.value.toLowerCase()
      allList = allList.filter(w => (w.work_order_no || '').toLowerCase().includes(kw) || (w.client_name || '').toLowerCase().includes(kw) || (w.title || '').toLowerCase().includes(kw))
    }
    if (kanbanFilterStage.value) allList = allList.filter(w => w.current_stage === kanbanFilterStage.value)
    if (kanbanFilterCategory.value) allList = allList.filter(w => w.project_category === kanbanFilterCategory.value)
    if (kanbanFilterActivity.value) allList = allList.filter(w => w.activity_name === kanbanFilterActivity.value)
    if (kanbanFilterStatus.value === 'timeout') allList = allList.filter(w => w.is_timeout)
    else if (kanbanFilterStatus.value === 'expiring') allList = allList.filter(w => !w.is_timeout && daysToDeadline(w) <= 3 && daysToDeadline(w) > 0)
    else if (kanbanFilterStatus.value === 'normal') allList = allList.filter(w => !w.is_timeout)
    if (kanbanFilterAssignee.value) allList = allList.filter(w => w.assigned_to === kanbanFilterAssignee.value)

    allKanbanCols.value.forEach(col => {
      const preserved = {}
      col.items?.forEach(wo => { preserved[wo.id] = wo._selected || false })
      col.items = allList.filter(w => w.current_stage === col.key).map(w => {
        const ddl = daysToDeadline(w)
        w._daysToDeadline = ddl
        w._deadlineLabel = ddl === Infinity ? (w.deadline || '无截止') : ddl < 0 ? `已超 ${Math.abs(ddl)} 天` : ddl === 0 ? '今天' : `${w.deadline} (${ddl}天)`
        w._deadlineClass = ddl < 0 ? 'deadline-overdue' : ddl <= 3 ? 'deadline-warning' : ''
        w._selected = preserved[w.id] || false
        return w
      }).sort((a, b) => {
        if (a.is_timeout && !b.is_timeout) return -1
        if (!a.is_timeout && b.is_timeout) return 1
        return daysToDeadline(a) - daysToDeadline(b)
      })
    })
  } catch {
    tableData.value = []
    total.value = 0
    allKanbanCols.value.forEach(col => { col.items = [] })
  } finally {
    loading.value = false
  }
}

async function loadSettings() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    if (settings.project_types?.length) adTypes.value = settings.project_types
    if (settings.activity_names?.length) activities.value = settings.activity_names
    if (settings.project_templates?.length) {
      activities.value = settings.project_templates.map(tmpl => ({ label: tmpl.name, value: tmpl.id, enabled: true }))
    }
  } catch {}
}

async function loadUserOptions() {
  try {
    const res = await api.get('/tenants/users')
    const payload = res.data || {}
    userOptions.value = (Array.isArray(payload) ? payload : (payload.list || [])).filter(u => u.status === 'active')
  } catch (e) {
    logger.error('加载人员列表失败:', e)
  }
}

function loadKanbanSettings() {
  try {
    const saved = localStorage.getItem('kanban_col_settings')
    if (saved) {
      JSON.parse(saved).forEach(s => {
        const col = allKanbanCols.value.find(c => c.key === s.key)
        if (col) { col.visible = s.visible; col.collapsed = s.collapsed || false }
      })
    }
  } catch {}
}

function saveKanbanSettings() {
  localStorage.setItem('kanban_col_settings', JSON.stringify(allKanbanCols.value.map(c => ({ key: c.key, visible: c.visible, collapsed: c.collapsed }))))
  ElMessage.success('列设置已保存')
}

function toggleCol(key) {
  const col = allKanbanCols.value.find(c => c.key === key)
  if (col) col.collapsed = !col.collapsed
}

function resetKanbanFilters() {
  kanbanSearch.value = ''
  kanbanFilterStage.value = ''
  kanbanFilterCategory.value = ''
  kanbanFilterActivity.value = ''
  kanbanFilterStatus.value = ''
  kanbanFilterAssignee.value = ''
  loadWorkOrders()
}

function resetFilters() {
  Object.assign(filters, { keyword: '', stage: '', status: '', project_category: '', activity_name: '', assigned_to: '' })
  dateRange.value = null
  loadWorkOrders()
}

function handleSelectionChange(rows) { selectedRows.value = rows }
function clearSelection() { tableRef.value?.clearSelection() }
function clearKanbanSelection() { allKanbanCols.value.forEach(col => col.items?.forEach(wo => { wo._selected = false })) }

// Context menu
function openContextMenu(e, wo) {
  contextMenu.show = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.wo = wo
}

function closeContextMenu() { contextMenu.show = false }

function contextAction(action) {
  closeContextMenu()
  const wo = contextMenu.wo
  if (!wo) return
  if (action === 'view') router.push(`/work-orders/${wo.id}`)
  else if (action === 'delete') deleteWorkOrder(wo)
  else { currentWoId.value = wo.id; currentWo.value = wo; dialogType.value = action }
}

function closeDialog() { dialogType.value = '' }

// Dialogs
function openRemarkDialog(wo) { currentWoId.value = wo.id; currentWo.value = wo; dialogType.value = 'remark' }
function openReassignDialog(wo) { currentWoId.value = wo.id; currentWo.value = wo; dialogType.value = 'reassign' }

// Drag and drop
function onDragStart(e, wo) { dragData.value = wo }
function onDragOverCol(e, colKey) { dragOverCol.value = colKey }
function onDragLeaveCol(e, colKey) { dragOverCol.value = null }

async function onDropOnCol(e, targetStage) {
  dragOverCol.value = null
  if (!dragData.value) return
  const wo = dragData.value
  dragData.value = null
  if (wo.current_stage === targetStage) return
  const fromIdx = STAGE_ORDER.indexOf(wo.current_stage)
  const toIdx = STAGE_ORDER.indexOf(targetStage)
  if (toIdx <= fromIdx) return ElMessage.warning('只能向后推进环节')
  if (Math.abs(toIdx - fromIdx) > 2) return ElMessage.warning('不能跨环节移动')
  try {
    await ElMessageBox.confirm(`将工单「${wo.work_order_no}」从 ${stageLabel(wo.current_stage)} 推进到 ${stageLabel(targetStage)}？`, '确认推进', { type: 'warning' })
  } catch { return }
  try {
    await api.put(`/work-orders/${wo.id}/stage`, { target_stage: targetStage })
    ElMessage.success('环节已更新')
    loadWorkOrders()
  } catch (err) { ElMessage.error(err.response?.data?.error || '更新失败') }
}

// Batch operations
async function executeKanbanBatch() {
  const ids = kanbanSelectedIds.value
  if (!ids.length) return ElMessage.warning('未选择工单')
  kanbanBatchExecuting.value = true
  try {
    if (kanbanBatchAction.value === 'advance') {
      if (!kanbanBatchTargetStage.value) return ElMessage.warning('请选择目标环节')
      await Promise.all(ids.map(id => api.put(`/work-orders/${id}/stage`, { target_stage: kanbanBatchTargetStage.value })))
      ElMessage.success(`已将 ${ids.length} 个工单推进到 ${stageLabel(kanbanBatchTargetStage.value)}`)
    } else if (kanbanBatchAction.value === 'dispatch') {
      if (!kanbanBatchForm.assigned_to) return ElMessage.warning('请选择负责人')
      await Promise.all(ids.map(id => api.post('/assignments', { work_order_id: id, assigned_to: kanbanBatchForm.assigned_to, deadline: kanbanBatchForm.deadline || null })))
      ElMessage.success(`已派单 ${ids.length} 个工单`)
    }
    showKanbanBatchDialog.value = false
    clearKanbanSelection()
    loadWorkOrders()
  } catch (e) { ElMessage.error(e.response?.data?.error || '批量操作失败') }
  finally { kanbanBatchExecuting.value = false }
}

// Export
function exportExcel() {
  const data = viewMode.value === 'kanban' ? allKanbanCols.value.flatMap(c => c.items || []) : tableData.value
  if (!data.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(data, [
    { key: 'work_order_no', label: '工单号' }, { key: 'title', label: '店铺名字' },
    { key: 'client_name', label: '甲方企业' }, { key: 'current_stage', label: '当前环节' },
    { key: 'assigned_to', label: '负责人' }, { key: 'deadline', label: '截止日期' },
  ], '工单列表')
  ElMessage.success(`已导出 ${data.length} 条数据`)
}

function exportKanbanExcel() {
  const allData = allKanbanCols.value.flatMap(c => c.items || [])
  if (!allData.length) return ElMessage.warning('没有可导出的数据')
  exportWithTimestamp(allData, [
    { key: 'work_order_no', label: '工单号' }, { key: 'title', label: '店铺名字' },
    { key: 'client_name', label: '甲方企业' }, { key: 'current_stage', label: '当前环节' },
    { key: 'assigned_to', label: '负责人' }, { key: 'deadline', label: '截止日期' },
  ], '看板工单')
  ElMessage.success(`已导出 ${allData.length} 条数据`)
}

function printKanban() { window.print() }

// CRUD
function openDispatch(row) { router.push('/dispatch') }
function openEdit(row) { router.push(`/work-orders/${row.id}`) }

async function deleteWorkOrder(row) {
  try {
    await ElMessageBox.confirm(`确定删除工单「${row.work_order_no}」吗？`, '提示', { type: 'warning' })
    await api.delete(`/work-orders/${row.id}`)
    ElMessage.success('已删除')
    loadWorkOrders()
  } catch {}
}

function handleRefresh() { loadWorkOrders(); ElMessage.success('已刷新') }

// Auto refresh
let refreshTimer = null
function startAutoRefresh() { stopAutoRefresh(); refreshTimer = setInterval(() => loadWorkOrders(), 120000) }
function stopAutoRefresh() { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null } }

onMounted(() => {
  loadSettings()
  loadWorkOrders()
  loadUserOptions()
  loadKanbanSettings()
  api.get('/clients').then(res => { clients.value = res.data?.list || res.data || [] }).catch(() => {})
  startAutoRefresh()
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => { stopAutoRefresh(); document.removeEventListener('click', closeContextMenu) })
</script>

<style scoped>
.page-header { margin-bottom: 24px; }
.page-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-card { margin-bottom: 16px; }
.kanban-filter-bar { margin-bottom: 12px; }
.kanban-wrap { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; }
.batch-bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #e6f7ff; border-radius: 4px; margin-bottom: 12px; font-size: 12px; }
.action-group { display: inline-flex; align-items: center; gap: 8px; }
.action-group .action-link { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; color: #2563eb; text-decoration: none; padding: 2px 4px; border-radius: 4px; cursor: pointer; }
.action-group .action-link:hover { background: rgba(37, 99, 235, 0.08); }
.action-group :deep(.el-button) { font-size: 13px; padding: 2px 4px; height: auto; }
.col-setting-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; margin-bottom: 4px; }
.col-setting-row:hover { background: #f5f5f5; }
.drag-handle { cursor: grab; color: #9ca3af; }
.deadline-overdue { color: #f5222d; font-weight: 600; }
.deadline-warning { color: #fa8c16; font-weight: 600; }
:deep(.el-pagination) { padding-top: 16px; }
@media print { .page-actions, .filter-card, .batch-bar { display: none !important; } }
</style>
