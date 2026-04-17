<template>
  <div>
    <div class="page-header flex-between">
      <h1 class="page-title">生产管理</h1>
      <div class="page-actions">
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-16">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:var(--color-warning)">{{ stats.pending }}</div>
          <div class="stat-label">待生产</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:var(--color-primary)">{{ stats.producing }}</div>
          <div class="stat-label">生产中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:var(--color-success)">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color:var(--color-text-primary)">{{ stats.materialTypes }}</div>
          <div class="stat-label">材料种类</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" type="card" class="mb-16">
      <el-tab-pane name="tasks">
        <template #label>生产任务 <el-badge :value="stats.pending" :hidden="!stats.pending" type="warning" style="margin-left:4px" /></template>
      </el-tab-pane>
      <el-tab-pane name="board">
        <template #label>材料看板 <el-badge :value="boardMaterials.length" :hidden="!boardMaterials.length" style="margin-left:4px" /></template>
      </el-tab-pane>
      <el-tab-pane label="生产记录" name="history" />
    </el-tabs>

    <!-- Tab 1: 生产任务 -->
    <el-card v-show="activeTab === 'tasks'">
      <div class="filter-bar mb-16">
        <el-input v-model="taskSearch" placeholder="搜索工单号/店铺名" clearable style="width:220px" @input="filterTasks" />
        <el-select v-model="taskMaterialFilter" placeholder="全部材料" clearable style="width:140px" @change="filterTasks">
          <el-option v-for="m in uniqueMaterials" :key="m" :label="m" :value="m" />
        </el-select>
        <el-select v-model="taskStatusFilter" placeholder="全部状态" clearable style="width:120px" @change="filterTasks">
          <el-option label="待生产" value="pending" />
          <el-option label="已完成" value="completed" />
        </el-select>
      </div>

      <el-table :data="filteredTaskGroups" stripe v-loading="loading">
        <el-table-column prop="work_order_no" label="工单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/production/${row.work_order_id}`" class="wo-link">{{ row.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="店铺名" min-width="140" />
        <el-table-column label="材料" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ adTypeLabel(row.material_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="面明细" min-width="180">
          <template #default="{ row }">
            <div class="face-list">
              <span v-for="(f, i) in row.faces" :key="i" class="face-item">{{ f.label }}({{ Number(f.width||0).toFixed(2) }}×{{ Number(f.height||0).toFixed(2) }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="面积(m²)" width="90">
          <template #default="{ row }">{{ row.totalArea.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.isCompleted ? 'success' : 'warning'" effect="plain">
              {{ row.isCompleted ? '已完成' : '待生产' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生产任务号" width="160">
          <template #default="{ row }">
            <span v-if="row.production_task_no" class="batch-tag">{{ row.production_task_no }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isCompleted" link type="primary" @click="startVerifyGroup(row)">标记完成</el-button>
            <router-link v-else :to="`/production/${row.work_order_id}`" class="wo-link" style="font-size:13px">查看</router-link>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Tab 2: 材料看板 -->
    <div v-show="activeTab === 'board'">
      <template v-if="boardMaterials.length">
        <div v-for="mat in boardMaterials" :key="mat.material_type" class="material-group-card mb-16">
          <el-card>
            <template #header>
              <div class="material-group-header">
                <div>
                  <span class="material-title">{{ adTypeLabel(mat.material_type) }}</span>
                  <span class="material-count">（{{ mat.items.length }} 个工单 · 共 {{ mat.totalArea.toFixed(2) }} m²）</span>
                </div>
                <el-button type="primary" size="small" @click="openVerifyDialog(mat.material_type)">
                  标记完成 ({{ mat.items.length }})
                </el-button>
              </div>
            </template>
            <el-table :data="mat.items" stripe>
              <el-table-column prop="work_order_no" label="工单号" width="160">
                <template #default="{ row }">
                  <router-link :to="`/production/${row.work_order_id}`" class="wo-link">{{ row.work_order_no }}</router-link>
                </template>
              </el-table-column>
              <el-table-column prop="title" label="店铺名" min-width="120" />
              <el-table-column label="面明细" min-width="200">
                <template #default="{ row }">
                  <span v-for="(f, i) in row.faces" :key="i" class="face-inline">{{ f.label }}({{ Number(f.width||0).toFixed(2) }}×{{ Number(f.height||0).toFixed(2) }})</span>
                </template>
              </el-table-column>
              <el-table-column label="面积(m²)" width="90">
                <template #default="{ row }">{{ row.totalArea.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button link type="primary" @click="startVerifyGroup(row)">标记完成</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </template>
      <el-card v-else>
        <el-empty description="暂无待生产任务" :image-size="80" />
      </el-card>
    </div>

    <!-- Tab 3: 生产记录 -->
    <el-card v-show="activeTab === 'history'">
      <div class="filter-bar mb-16">
        <el-input v-model="historySearch" placeholder="搜索批次号/工单号" clearable style="width:220px" @input="filterHistory" />
        <el-select v-model="historyMaterialFilter" placeholder="全部材料" clearable style="width:140px" @change="filterHistory">
          <el-option v-for="m in historyMaterials" :key="m" :label="m" :value="m" />
        </el-select>
      </div>

      <el-table :data="filteredBatches" stripe v-loading="historyLoading">
        <el-table-column label="批次号" width="200">
          <template #default="{ row }">
            <span class="batch-tag">{{ row.batch_no }}</span>
          </template>
        </el-table-column>
        <el-table-column label="材料类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ adTypeLabel(row.material_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="完成/总数" width="100">
          <template #default="{ row }">{{ row.completed_count }}/{{ row.total_count }}</template>
        </el-table-column>
        <el-table-column label="生产日期" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 19) || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">{{ row.creator?.name || row.creator_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="150">
          <template #default="{ row }">{{ row.notes || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showBatchDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination v-model:current-page="historyPage" v-model:page-size="historyPageSize"
          :total="historyTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="loadBatches" @current-change="loadBatches" />
      </div>
    </el-card>

    <!-- 核对完成对话框 -->
    <el-dialog v-model="verifyVisible" :title="`核对完成 — ${adTypeLabel(verifyData.material_type)}`" width="560px" destroy-on-close>
      <div class="verify-dialog-content">
        <div class="verify-batch-no">
          <span class="label">批次号</span>
          <span class="value">{{ verifyData.batch_no }}</span>
        </div>
        <el-alert type="success" :closable="false" show-icon style="margin-bottom:16px">
          请对照实物，勾选<strong>已生产完成</strong>的工单。未勾选的视为未完成，下次继续生产。
        </el-alert>
        <div class="verify-counter">已确认 <strong>{{ verifyCheckedCount }}</strong> / {{ verifyData.items?.length || 0 }}</div>
        <el-checkbox-group v-model="verifyChecked" class="verify-checklist">
          <div v-for="(item, idx) in verifyData.items" :key="idx" class="verify-item">
            <el-checkbox :value="item.work_order_id">
              <span class="verify-item-title"><strong>{{ item.work_order_no }}</strong> {{ item.title }} — {{ item.faceSummary }} ({{ item.area.toFixed(2) }}m²)</span>
            </el-checkbox>
            <div v-if="item.source_files?.length" class="verify-item-files">
              <el-link v-for="(f, fi) in item.source_files" :key="fi" :href="f" type="primary" target="_blank" :underline="false" style="margin-right:12px">
                📄 {{ f.split('/').pop() }}
              </el-link>
            </div>
          </div>
        </el-checkbox-group>
        <el-input v-model="verifyNotes" type="textarea" :rows="2" placeholder="生产备注（可选）" style="margin-top:12px" />
      </div>
      <template #footer>
        <el-button @click="verifyVisible = false">取消</el-button>
        <el-button type="success" @click="confirmVerify">确认完成</el-button>
      </template>
    </el-dialog>

    <!-- 批次详情对话框 -->
    <el-dialog v-model="batchDetailVisible" title="批次详情" width="560px" destroy-on-close>
      <div v-if="batchDetail">
        <div class="batch-detail-header mb-16">
          <span class="batch-tag">{{ batchDetail.batch_no }}</span>
          <el-tag size="small" type="info" effect="plain" style="margin-left:8px">{{ adTypeLabel(batchDetail.material_type) }}</el-tag>
          <el-tag size="small" :type="batchDetail.completed_count === batchDetail.total_count ? 'success' : 'warning'" effect="plain" style="margin-left:8px">
            {{ batchDetail.completed_count }}/{{ batchDetail.total_count }} 已核对
          </el-tag>
        </div>
        <el-descriptions :column="2" border size="small" class="mb-16">
          <el-descriptions-item label="生产日期">{{ batchDetail.created_at?.slice(0, 19) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ batchDetail.creator?.name || batchDetail.creator_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成数量">{{ batchDetail.completed_count }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ batchDetail.notes || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="mb-8"><strong>核对清单</strong></div>
        <div v-for="item in batchDetail.checklist" :key="item.work_order_id" class="batch-check-item">
          <el-icon :color="item.checked ? 'var(--color-success)' : 'var(--color-text-tertiary)'">
            <CircleCheckFilled v-if="item.checked" />
            <CircleClose v-else />
          </el-icon>
          <div class="batch-check-info">
            <span class="batch-check-wo">{{ item.work_order_no }} {{ item.title }}</span>
            <el-tag size="small" :type="item.checked ? 'success' : 'info'" effect="plain">
              {{ item.checked ? '已核对' : '未核对' }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Refresh, CircleCheckFilled, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const loading = ref(false)
const activeTab = ref('tasks')
const adTypeMap = ref({})

// ===== 数据 =====
const allTasks = ref([])
const batches = ref([])
const historyLoading = ref(false)
const historyPage = ref(1)
const historyPageSize = ref(20)
const historyTotal = ref(0)

// 已完成的工单+材料组合
const completedGroups = ref(new Set())

// ===== 统计 =====
const stats = reactive({ pending: 0, producing: 0, completed: 0, materialTypes: 0 })

// ===== 筛选 =====
const taskSearch = ref('')
const taskMaterialFilter = ref('')
const taskStatusFilter = ref('')
const historySearch = ref('')
const historyMaterialFilter = ref('')

// ===== 核对对话框 =====
const verifyVisible = ref(false)
const verifyData = reactive({ material_type: '', batch_no: '', items: [] })
const verifyChecked = ref([])
const verifyNotes = ref('')
const verifyCheckedCount = computed(() => verifyChecked.value.length)

// ===== 批次详情 =====
const batchDetailVisible = ref(false)
const batchDetail = ref(null)

// ===== 材料映射 =====
async function loadSettings() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    const templates = settings.project_templates || []
    for (const tmpl of templates) {
      for (const adType of (tmpl.ad_types || [])) {
        if (adType.key && adType.label) adTypeMap.value[adType.key] = adType.label
      }
    }
  } catch {}
}

function adTypeLabel(v) {
  if (!v) return '—'
  return adTypeMap.value[v] || v
}

// ===== 加载工单数据 =====
async function loadWorkOrders() {
  loading.value = true
  try {
    const res = await api.get('/work-orders', { params: { stage: 'production', page: 1, limit: 100 } })
    const payload = res.data || {}
    const list = Array.isArray(payload) ? payload : (payload.list || [])

    // 从 productions 数据构建完成状态映射和生产任务号映射
    completedGroups.value = new Set()
    const productionTaskNos = {}  // { "workOrderId|||material_type": "PROD-xxx" }
    for (const wo of list) {
      if (wo.productions) {
        for (const p of wo.productions) {
          if (p.status === 'completed' || p.status === 'shipped') {
            completedGroups.value.add(`${wo.id}|||${p.material_type}`)
          }
          if (p.production_task_no) {
            productionTaskNos[`${wo.id}|||${p.material_type}`] = p.production_task_no
          }
        }
      }
    }

    allTasks.value = flattenWorkOrders(list, productionTaskNos)
    updateStats()
  } catch (e) {
    ElMessage.error('加载工单失败')
    allTasks.value = []
  } finally {
    loading.value = false
  }
}

// 将工单数据拆解为"工单+材料+面"的任务列表
function flattenWorkOrders(workOrders, productionTaskNos = {}) {
  const tasks = []
  for (const wo of workOrders) {
    // 从测量数据中提取材料+面信息
    const measurements = wo.measurements || []
    for (const m of measurements) {
      // materials 可能是 JSON 字符串，需要解析
      let materials = m.materials || []
      if (typeof materials === 'string') {
        try { materials = JSON.parse(materials) } catch { materials = [] }
      }
      for (const mat of materials) {
        const faces = mat.faces || []
        // 从设计数据获取该工单的源文件
        const sourceFiles = []
        if (wo.designs) {
          for (const d of wo.designs) {
            if (d.status === 'approved') {
              let srcFiles = d.source_files || []
              if (typeof srcFiles === 'string') { try { srcFiles = JSON.parse(srcFiles) } catch { srcFiles = [] } }
              for (const f of srcFiles) {
                if (!sourceFiles.includes(f)) sourceFiles.push(f)
              }
            }
          }
        }
        // 获取该工单+材料的生产任务号
        const taskNo = productionTaskNos[`${wo.id}|||${mat.material_type}`] || ''
        for (const face of faces) {
          tasks.push({
            work_order_id: wo.id,
            work_order_no: wo.work_order_no,
            title: wo.title,
            material_type: mat.material_type || '未分类',
            face_label: face.label || '—',
            width: face.width || 0,
            height: face.height || 0,
            area: face.area || 0,
            source_files: sourceFiles,
            production_task_no: taskNo,
          })
        }
      }
    }
  }
  return tasks
}

// ===== 按工单+材料合并 =====
function groupByWoMaterial(taskList) {
  const map = {}
  taskList.forEach(t => {
    const key = `${t.work_order_id}|||${t.material_type}`
    if (!map[key]) {
      map[key] = {
        work_order_id: t.work_order_id,
        work_order_no: t.work_order_no,
        title: t.title,
        material_type: t.material_type,
        faces: [],
        totalArea: 0,
        production_task_no: t.production_task_no || '',
        source_files: [],
      }
    }
    map[key].faces.push({ label: t.face_label, width: t.width, height: t.height })
    map[key].totalArea += (t.area || 0)
    if (t.source_files?.length) {
      t.source_files.forEach(f => { if (!map[key].source_files.includes(f)) map[key].source_files.push(f) })
    }
  })
  return Object.values(map)
}

// 判断工单+材料组合是否已完成
function isGroupCompleted(group) {
  return completedGroups.value.has(`${group.work_order_id}|||${group.material_type}`)
}

// ===== 筛选后的任务 =====
const filteredTaskGroups = computed(() => {
  let groups = groupByWoMaterial(allTasks.value).map(g => ({
    ...g,
    isCompleted: isGroupCompleted(g),
  }))
  if (taskSearch.value) {
    const kw = taskSearch.value.toLowerCase()
    groups = groups.filter(g => g.work_order_no.toLowerCase().includes(kw) || g.title.toLowerCase().includes(kw))
  }
  if (taskMaterialFilter.value) {
    groups = groups.filter(g => g.material_type === taskMaterialFilter.value)
  }
  if (taskStatusFilter.value === 'completed') {
    groups = groups.filter(g => g.isCompleted)
  } else if (taskStatusFilter.value === 'pending') {
    groups = groups.filter(g => !g.isCompleted)
  }
  return groups
})

// ===== 材料看板 =====
const boardMaterials = computed(() => {
  const groups = groupByWoMaterial(allTasks.value).filter(g => !isGroupCompleted(g))
  const byMat = {}
  groups.forEach(item => {
    if (!byMat[item.material_type]) byMat[item.material_type] = { material_type: item.material_type, items: [], totalArea: 0 }
    byMat[item.material_type].items.push(item)
    byMat[item.material_type].totalArea += item.totalArea
  })
  return Object.values(byMat).sort((a, b) => b.items.length - a.items.length)
})

const uniqueMaterials = computed(() => [...new Set(allTasks.value.map(t => t.material_type))])

// ===== 批次数据 =====
async function loadBatches() {
  historyLoading.value = true
  try {
    const res = await api.get('/production/batches', {
      params: { page: historyPage.value, limit: historyPageSize.value }
    })
    const payload = res.data || {}
    batches.value = payload.list || []
    historyTotal.value = payload.total || 0
  } catch {
    batches.value = []
    historyTotal.value = 0
  } finally {
    historyLoading.value = false
  }
}

const filteredBatches = computed(() => {
  let list = batches.value
  if (historySearch.value) {
    const kw = historySearch.value.toLowerCase()
    list = list.filter(b => b.batch_no?.toLowerCase().includes(kw) || JSON.stringify(b.checklist).toLowerCase().includes(kw))
  }
  if (historyMaterialFilter.value) {
    list = list.filter(b => b.material_type === historyMaterialFilter.value)
  }
  return list
})

const historyMaterials = computed(() => [...new Set(batches.value.map(b => b.material_type))])

// ===== 统计更新 =====
function updateStats() {
  const groups = groupByWoMaterial(allTasks.value)
  const completed = groups.filter(g => isGroupCompleted(g)).length
  stats.pending = groups.length - completed
  stats.completed = completed
  stats.producing = 0
  stats.materialTypes = new Set(allTasks.value.map(t => t.material_type)).size
}

// ===== 筛选 =====
function filterTasks() {} // computed 自动响应
function filterHistory() {} // computed 自动响应

// ===== 核对流程 =====
function openVerifyDialog(materialType) {
  const items = groupByWoMaterial(allTasks.value).filter(g => g.material_type === materialType && !isGroupCompleted(g))
  if (!items.length) { ElMessage.warning('没有待生产任务'); return }
  verifyData.material_type = materialType
  verifyData.batch_no = '自动生成'
  verifyData.items = items.map(g => ({
    work_order_id: g.work_order_id,
    work_order_no: g.work_order_no,
    title: g.title,
    faceSummary: g.faces.map(f => f.label).join(' + '),
    area: g.totalArea,
    source_files: g.source_files,
  }))
  verifyChecked.value = verifyData.items.map(i => i.work_order_id)
  verifyNotes.value = ''
  verifyVisible.value = true
}

function startVerifyGroup(group) {
  verifyData.material_type = group.material_type
  verifyData.batch_no = '自动生成'
  verifyData.items = [{
    work_order_id: group.work_order_id,
    work_order_no: group.work_order_no,
    title: group.title,
    faceSummary: group.faces.map(f => f.label).join(' + '),
    area: group.totalArea,
    source_files: group.source_files,
  }]
  verifyChecked.value = verifyData.items.map(i => i.work_order_id)
  verifyNotes.value = ''
  verifyVisible.value = true
}

async function confirmVerify() {
  if (!verifyChecked.value.length) {
    ElMessage.warning('请至少勾选一个已完成的工单')
    return
  }

  const items = verifyData.items.map(item => ({
    work_order_id: item.work_order_id,
    checked: verifyChecked.value.includes(item.work_order_id),
  }))

  try {
    const res = await api.post('/production/batches', {
      material_type: verifyData.material_type,
      items,
      notes: verifyNotes.value,
    })
    const data = res.data || {}
    const batch = data.batch
    verifyVisible.value = false

    // 更新本地完成状态
    items.forEach(item => {
      if (item.checked) {
        completedGroups.value.add(`${item.work_order_id}|||${verifyData.material_type}`)
      }
    })

    await loadWorkOrders()
    await loadBatches()

    const uncompleted = verifyData.items.length - verifyChecked.value.length
    if (uncompleted > 0) {
      ElMessage.success(`${adTypeLabel(verifyData.material_type)}：${verifyChecked.value.length} 个已确认，${uncompleted} 个未完成下次继续`)
    } else {
      ElMessage.success(`批次 ${batch?.batch_no} 已完成，${verifyChecked.value.length} 个工单标记完成`)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '提交失败')
  }
}

// ===== 批次详情 =====
async function showBatchDetail(row) {
  try {
    const res = await api.get(`/production/batches/${row.id}`)
    batchDetail.value = res.data || {}
    batchDetailVisible.value = true
  } catch (e) {
    ElMessage.error('加载批次详情失败')
  }
}

function handleRefresh() {
  loadWorkOrders()
  loadBatches()
}

onMounted(() => {
  loadSettings()
  loadWorkOrders()
  loadBatches()
})
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.page-actions { display: flex; gap: var(--space-2); }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-16 { margin-bottom: var(--space-4); }
.mb-8 { margin-bottom: var(--space-2); }

.stat-card { text-align: center; padding: 4px 0; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; color: var(--color-text-tertiary); margin-top: 4px; }

.filter-bar { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }

.wo-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
.wo-link:hover { text-decoration: underline; }

.batch-tag {
  font-family: monospace; font-size: 12px; font-weight: 600;
  color: var(--color-primary); background: #dbeafe;
  padding: 2px 8px; border-radius: 4px; display: inline-block;
}

.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }

.face-list { display: flex; flex-direction: column; gap: 2px; }
.face-item { font-size: 12px; color: var(--color-text-secondary); }
.face-inline { display: inline-block; font-size: 12px; color: var(--color-text-secondary); margin-right: 8px; }

.material-group-header { display: flex; justify-content: space-between; align-items: center; }
.material-title { font-weight: 700; font-size: 15px; color: var(--color-primary); }
.material-count { font-size: 12px; color: var(--color-text-secondary); margin-left: 8px; }

.verify-dialog-content { padding: 0; }
.verify-batch-no { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--el-border-color-lighter); }
.verify-batch-no .label { font-size: 13px; color: var(--color-text-secondary); }
.verify-batch-no .value { font-family: monospace; font-size: 14px; font-weight: 600; color: var(--color-primary); background: #dbeafe; padding: 2px 12px; border-radius: 4px; }
.verify-counter { font-size: 14px; margin-bottom: 8px; color: var(--color-text-secondary); }
.verify-counter strong { color: var(--color-primary); }
.verify-checklist { max-height: 300px; overflow-y: auto; }
.verify-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.verify-item:last-child { border-bottom: none; }
.verify-item-title { font-size: 13px; }
.verify-item-files { padding-left: 24px; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }

.batch-detail-header { display: flex; align-items: center; }
.batch-check-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.batch-check-item:last-child { border-bottom: none; }
.batch-check-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.batch-check-wo { font-size: 13px; font-weight: 500; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
