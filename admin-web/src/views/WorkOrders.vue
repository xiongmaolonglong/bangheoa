<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">工单管理</h1>
      <div>
        <el-button :type="viewMode === 'list' ? '' : 'primary'" @click="viewMode = viewMode === 'kanban' ? 'list' : 'kanban'">
          {{ viewMode === 'kanban' ? '列表视图' : '看板视图' }}
        </el-button>
        <el-button type="primary" @click="showCreate = true">+ 补录工单</el-button>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-if="viewMode === 'kanban'" class="kanban-wrap">
      <div v-for="col in kanbanCols" :key="col.key" class="kanban-col">
        <div class="kanban-header">
          <span class="col-title">{{ col.label }}</span>
          <span class="col-count">{{ col.items?.length || 0 }}</span>
        </div>
        <div class="kanban-body">
          <el-card v-for="wo in col.items" :key="wo.id" shadow="hover" class="kanban-card"
            @click="$router.push(`/work-orders/${wo.id}`)">
            <div class="card-tags">
              <el-tag size="small" type="primary">{{ wo.client_name }}</el-tag>
              <el-tag v-if="wo.project_category" size="small" type="info">{{ wo.project_category }}</el-tag>
              <el-tag v-if="wo.is_timeout" size="small" type="danger">超时</el-tag>
            </div>
            <div class="card-title">{{ wo.title }}</div>
            <div class="card-meta">
              <span>{{ wo.assigned_to || '—' }}</span>
              <span>{{ wo.deadline || '—' }}</span>
            </div>
          </el-card>
          <el-empty v-if="!col.items?.length" :image-size="40" description="暂无工单" />
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else>
      <!-- Filters -->
      <el-card class="mb-16">
        <el-form :inline="true" :model="filters">
          <el-form-item>
            <el-input v-model="filters.keyword" placeholder="搜索工单号/甲方/地址" clearable style="width:240px" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="filters.stage" placeholder="全部环节" clearable>
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
            <el-select v-model="filters.status" placeholder="全部状态" clearable>
              <el-option label="正常" value="normal" />
              <el-option label="超时" value="timeout" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWorkOrders">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Table -->
      <el-card>
        <el-table :data="tableData" stripe v-loading="loading">
          <el-table-column type="selection" width="40" />
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="client_name" label="甲方企业" width="140" />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.project_category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前环节" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="stageTagType(row.current_stage)">{{ stageLabel(row.current_stage) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.is_timeout ? 'danger' : 'success'">
                {{ row.is_timeout ? '超时' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assigned_to" label="负责人" width="80" />
          <el-table-column prop="deadline" label="截止日期" width="110" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="action-link">查看</router-link>
              <el-button v-if="row.current_stage === 'assignment'" link type="primary" @click="openDispatch(row)">派单</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
            :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
            @size-change="loadWorkOrders" @current-change="loadWorkOrders" />
        </div>
      </el-card>
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreate" title="补录工单" width="520px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="甲方企业">
          <el-select v-model="createForm.client_id" placeholder="请选择" style="width:100%">
            <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="createForm.title" placeholder="例如：XX门店招牌" />
        </el-form-item>
        <el-form-item label="项目类型">
          <el-select v-model="createForm.project_type" style="width:100%">
            <el-option label="门头招牌" value="门头招牌" />
            <el-option label="灯箱" value="灯箱" />
            <el-option label="LED显示屏" value="LED显示屏" />
            <el-option label="室内广告" value="室内广告" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目分类">
          <el-select v-model="createForm.project_category" style="width:100%">
            <el-option label="日常" value="日常" />
            <el-option label="520" value="520" />
            <el-option label="国庆" value="国庆" />
            <el-option label="春节" value="春节" />
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
        <el-button type="primary" @click="createWorkOrder">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'

const viewMode = ref('kanban')
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreate = ref(false)
const clients = ref([])

const filters = reactive({ keyword: '', stage: '', status: '' })
const createForm = reactive({ client_id: '', title: '', project_type: '门头招牌', project_category: '日常', address: '', description: '' })

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

async function loadWorkOrders() {
  loading.value = true
  try {
    const res = await api.get('/work-orders', {
      params: { ...filters, page: page.value, limit: pageSize.value }
    })
    const data = res.data || {}
    tableData.value = data.list || []
    total.value = data.total || 0
    // Group by stage for kanban
    const allRes = await api.get('/work-orders', { params: { limit: 200 } })
    const allList = allRes.data?.list || []
    kanbanCols.value.forEach(col => {
      col.items = allList.filter(w => w.current_stage === col.key)
    })
  } catch {
    // Demo data
    tableData.value = demoList
    total.value = 28
    kanbanCols.value[0].items = demoList.filter(w => w.current_stage === 'declaration')
    kanbanCols.value[1].items = demoList.filter(w => w.current_stage === 'assignment')
    kanbanCols.value[2].items = demoList.filter(w => w.current_stage === 'measurement')
    kanbanCols.value[3].items = demoList.filter(w => w.current_stage === 'design')
    kanbanCols.value[4].items = demoList.filter(w => w.current_stage === 'production')
    kanbanCols.value[5].items = demoList.filter(w => w.current_stage === 'construction')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.stage = ''
  filters.status = ''
  loadWorkOrders()
}

function openDispatch(row) {
  // Navigate to dispatch page pre-selecting this order
  ElMessage.info('跳转到派单页面')
}

async function createWorkOrder() {
  try {
    await api.post('/work-orders', createForm)
    ElMessage.success('创建成功')
    showCreate.value = false
    loadWorkOrders()
  } catch {}
}

onMounted(() => {
  loadWorkOrders()
  // Load clients for dropdown
  api.get('/clients').then(res => { clients.value = res.data?.list || res.data || [] }).catch(() => {})
})

const demoList = [
  { id: 1, work_order_no: 'GG-2026-0001', title: '步步高 XX 门店招牌', client_name: '步步高商业连锁', project_category: '日常', current_stage: 'declaration', is_timeout: false, assigned_to: '', deadline: '' },
  { id: 2, work_order_no: 'GG-2026-0002', title: '茶颜悦色 IFS 店灯箱', client_name: '茶颜悦色', project_category: '国庆', current_stage: 'declaration', is_timeout: false, assigned_to: '', deadline: '' },
  { id: 3, work_order_no: 'GG-2026-0003', title: '步步高 XX 酒店工程', client_name: '步步高商业连锁', project_category: '520', current_stage: 'design', is_timeout: true, assigned_to: '王设计', deadline: '04-10' },
  { id: 5, work_order_no: 'GG-2026-0005', title: '步步高 XX 超市招牌', client_name: '步步高商业连锁', project_category: '日常', current_stage: 'measurement', is_timeout: false, assigned_to: '李四', deadline: '04-15' },
  { id: 7, work_order_no: 'GG-2026-0007', title: '步步高 XX 银行门头', client_name: '步步高商业连锁', project_category: '日常', current_stage: 'assignment', is_timeout: true, assigned_to: '', deadline: '04-11' },
  { id: 10, work_order_no: 'GG-2026-0010', title: '茶颜悦色五一广场店', client_name: '茶颜悦色', project_category: '国庆', current_stage: 'assignment', is_timeout: false, assigned_to: '', deadline: '04-20' },
  { id: 12, work_order_no: 'GG-2026-0012', title: '步步高 XX 餐厅发光字', client_name: '步步高商业连锁', project_category: '日常', current_stage: 'production', is_timeout: false, assigned_to: '孙七', deadline: '04-12' }
]
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-16 { margin-bottom: 16px; }
.kanban-wrap { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; }
.kanban-col { min-width: 260px; flex: 1; }
.kanban-header {
  background: #fafafa; padding: 10px 14px; border-radius: 8px 8px 0 0;
  border: 1px solid #e8e8e8; border-bottom: 2px solid #d9d9d9;
  display: flex; align-items: center; justify-content: space-between;
}
.col-title { font-weight: 500; font-size: 13px; color: #595959; }
.col-count { background: #e8e8e8; color: #8c8c8c; font-size: 11px; padding: 1px 8px; border-radius: 10px; }
.kanban-body {
  background: #f5f7fa; border-radius: 0 0 8px 8px; padding: 8px;
  min-height: 200px; border: 1px solid #e8e8e8; border-top: none;
}
.kanban-card { cursor: pointer; margin-bottom: 8px; }
.kanban-card :deep(.el-card__body) { padding: 12px; }
.card-tags { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.card-title { font-size: 13px; font-weight: 500; color: #1a1a1a; margin-bottom: 6px; }
.card-meta { font-size: 12px; color: #8c8c8c; display: flex; justify-content: space-between; }
.wo-link { color: #1890ff; font-family: monospace; font-size: 13px; text-decoration: none; }
.wo-link:hover { color: #40a9ff; }
.action-link { color: #1890ff; cursor: pointer; margin-right: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; padding-top: 16px; }
</style>
