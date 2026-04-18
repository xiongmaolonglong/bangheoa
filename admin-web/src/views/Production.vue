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
          <div class="stat-label">排版中</div>
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
        <el-input v-model="taskSearch" placeholder="搜索工单号/店铺名" clearable style="width:220px" />
        <el-select v-model="taskStatusFilter" placeholder="全部状态" clearable style="width:120px">
          <el-option label="待生产" value="pending" />
          <el-option label="排版中" value="typesetting" />
          <el-option label="已完成" value="completed" />
        </el-select>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="selectedShops.length > 0" class="batch-action-bar mb-16">
        <span class="batch-info">已选 {{ selectedShops.length }} 个店铺</span>
        <el-button type="primary" size="small" @click="downloadSelectedFiles">
          <el-icon style="margin-right:4px"><Download /></el-icon>下载CDR
        </el-button>
        <el-button type="success" size="small" plain @click="exportSelectedShops">
          导出生产单
        </el-button>
        <el-button type="warning" size="small" @click="markAsTypesetting">
          标记排版中
        </el-button>
        <el-button size="small" @click="clearSelection">清除</el-button>
      </div>

      <!-- 无选择时显示导出全部 -->
      <div v-else class="filter-bar mb-16">
        <el-button type="success" plain @click="exportAllTasks">
          <el-icon style="margin-right:4px"><Download /></el-icon>导出全部生产单
        </el-button>
      </div>

      <el-table
        :data="filteredTaskShops"
        stripe
        v-loading="loading"
        @selection-change="handleShopSelection"
        row-key="work_order_id"
      >
        <el-table-column type="selection" width="50" :selectable="(row) => !row.isCompleted" />
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="shop-expand-content">
              <div v-for="(mat, mIdx) in row.materials" :key="mIdx" class="shop-material-group">
                <div class="shop-material-title">
                  {{ adTypeLabel(mat.material_type) }}
                  <span v-if="mat.group_name" class="shop-group-name">（{{ mat.group_name }}）</span>
                </div>
                <div v-for="(face, idx) in mat.faces" :key="idx" class="shop-face-row">
                  <span class="face-label">{{ face.label }}</span>
                  <span class="face-size">{{ Number(face.width||0).toFixed(2) }}×{{ Number(face.height||0).toFixed(2) }}m</span>
                  <span class="face-area">{{ face.area.toFixed(2) }}m²</span>
                  <el-tag size="small" :type="face.completed ? 'success' : (face.typesetting ? 'warning' : 'info')" effect="plain">
                    {{ face.completed ? '已完成' : (face.typesetting ? '排版中' : '待生产') }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="work_order_no" label="工单号" width="140">
          <template #default="{ row }">
            <router-link :to="`/production/${row.work_order_id}`" class="wo-link">{{ row.work_order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="店铺名" min-width="140" />
        <el-table-column label="甲方" width="80">
          <template #default="{ row }">
            <span v-if="row.client_name" class="text-muted">{{ row.client_name }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="材料" min-width="120">
          <template #default="{ row }">
            <span v-for="(mat, idx) in row.materials" :key="idx" class="material-tag">
              {{ adTypeLabel(mat.material_type) }}{{ idx < row.materials.length - 1 ? '、' : '' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="点位" width="50">
          <template #default="{ row }">
            {{ row.materials.reduce((sum, m) => sum + m.faces.length, 0) }}
          </template>
        </el-table-column>
        <el-table-column label="面积(m²)" width="70">
          <template #default="{ row }">{{ row.totalArea.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="源文件" width="80">
          <template #default="{ row }">
            <a v-if="row.sourceFile" :href="row.sourceFile" target="_blank" class="file-link" :title="row.sourceFile.split('/').pop()">
              📄 CDR
            </a>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="getShopStatusType(row)" effect="plain">
              {{ getShopStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isCompleted" link type="primary" @click="markShopComplete(row)">标记完成</el-button>
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
                <div class="material-actions">
                  <el-button type="success" size="small" plain @click="exportProductionSheet(mat)">
                    导出生产单
                  </el-button>
                  <el-button type="primary" size="small" @click="openVerifyDialog(mat.material_type)">
                    标记完成 ({{ mat.items.length }})
                  </el-button>
                </div>
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
                  <el-tag v-if="row.is_unified" type="warning" effect="dark" size="small" style="margin-right:4px">一体 {{ unifiedTotalSize(row.faces) }}</el-tag>
                  <template v-else>
                    <span v-for="(f, i) in row.faces" :key="i" class="face-inline">{{ f.label }}({{ Number(f.width||0).toFixed(2) }}×{{ Number(f.height||0).toFixed(2) }})</span>
                  </template>
                  <span v-if="row.totalQty > 0" class="face-inline qty-item">需生产 {{ row.totalQty }} 张</span>
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
            <el-checkbox :value="item.id">
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
import { Refresh, CircleCheckFilled, CircleClose, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx-js-style'
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
// 排版中的工单组
const typesettingGroups = ref(new Set())
// 选中的店铺
const selectedShops = ref([])

// ===== 统计 =====
const stats = reactive({ pending: 0, producing: 0, completed: 0, materialTypes: 0 })

// ===== 筛选 =====
const taskSearch = ref('')
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

// 计算一体组合总尺寸（宽度相加，高度相加）
function unifiedTotalSize(faces) {
  if (!faces || !faces.length) return ''
  const totalW = faces.reduce((s, f) => s + (Number(f.width) || 0), 0)
  const totalH = faces.reduce((s, f) => s + (Number(f.height) || 0), 0)
  return `${totalW.toFixed(2)}×${totalH.toFixed(2)}`
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
    const productionTaskNos = {}  // { "workOrderId|||material_type|||groupIndex": "PROD-xxx" }
    for (const wo of list) {
      if (wo.productions) {
        for (const p of wo.productions) {
          // 使用 group_index 精确匹配，兼容旧数据用 group_name
          const groupKey = p.group_index !== undefined
            ? `${wo.id}|||${p.material_type}|||${p.group_index}`
            : `${wo.id}|||${p.material_type}`
          if (p.status === 'completed' || p.status === 'shipped') {
            completedGroups.value.add(groupKey)
          }
          if (p.production_task_no) {
            productionTaskNos[groupKey] = p.production_task_no
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

      // 从设计数据获取该工单的源文件（只取最后一个审核通过版本的第一个文件）
      const sourceFiles = []
      if (wo.designs) {
        const approvedDesigns = wo.designs.filter(d => d.status === 'approved')
        if (approvedDesigns.length > 0) {
          const lastDesign = approvedDesigns[approvedDesigns.length - 1]
          let srcFiles = lastDesign.source_files || []
          if (typeof srcFiles === 'string') { try { srcFiles = JSON.parse(srcFiles) } catch { srcFiles = [] } }
          // 只取第一个CDR文件
          if (srcFiles.length > 0) sourceFiles.push(srcFiles[0])
        }
      }

      // 全局组索引：同一工单内同材料类型的每个 mat 块分配不同索引
      const matGroupCounts = {}  // { "signboard": 当前索引 }
      for (const mat of materials) {
        const matType = mat.material_type || '未分类'
        if (!matGroupCounts[matType]) matGroupCounts[matType] = 0

        const faces = mat.faces || []
        // 这个 mat 块内的面（可能是一体组合或独立面）
        const isUnified = faces.some(f => f.is_unified)
        const groupName = faces[0]?.group_name || ''

        // 获取生产任务号（用组块索引）
        const groupKey = `${wo.id}|||${matType}|||${matGroupCounts[matType]}`
        const taskNo = productionTaskNos[groupKey] || ''

        for (const face of faces) {
          // 动态查找张数字段：优先 field_ 数字字段，其次常见字段名
          let qty = 0
          const excludeKeys = ['width', 'height', '_widthM', '_heightM', 'area', 'unit', 'direction', 'photos', 'notes', 'label', 'group_name', 'is_unified', 'special_flag', 'template_id']
          for (const [key, val] of Object.entries(face)) {
            if (excludeKeys.includes(key)) continue
            const num = Number(val)
            if (!isNaN(num) && num > 0 && Number.isFinite(num)) {
              // field_ 开头或字段名含"张"/"数量"/"qty"优先
              if (key.startsWith('field_') || /张|数量|qty|quantity/i.test(key)) {
                qty = num
                break
              }
            }
          }
          tasks.push({
            work_order_id: wo.id,
            work_order_no: wo.work_order_no,
            title: wo.title,
            material_type: matType,
            face_label: face.label || '—',
            width: face.width || 0,
            height: face.height || 0,
            area: face.area || 0,
            source_files: sourceFiles,
            production_task_no: taskNo,
            group_name: groupName,
            is_unified: isUnified,
            group_index: matGroupCounts[matType],
            qty,
            activity_name: wo.activity_name || '',   // 项目名称
            client_name: wo.client_name || '',       // 甲方名称（元素）
          })
        }

        // 完成一个材料块后，索引递增
        matGroupCounts[matType]++
      }
    }
  }
  return tasks
}

// ===== 按工单+材料+组合合并（同类型不同组分开显示） =====
function groupByWoMaterial(taskList) {
  const map = {}
  taskList.forEach(t => {
    // 用 group_index 区分同一工单同材料类型的不同组
    const groupKey = `${t.work_order_id}|||${t.material_type}|||${t.group_index}`
    if (!map[groupKey]) {
      map[groupKey] = {
        work_order_id: t.work_order_id,
        work_order_no: t.work_order_no,
        title: t.title,
        material_type: t.material_type,
        faces: [],
        totalArea: 0,
        totalQty: 0,
        production_task_no: t.production_task_no || '',
        source_files: [],
        is_unified: t.is_unified,
        group_name: t.group_name,
        group_index: t.group_index,
        activity_name: t.activity_name || '',
        client_name: t.client_name || '',
      }
    }
    map[groupKey].faces.push({ label: t.face_label, width: t.width, height: t.height })
    map[groupKey].totalArea += (t.area || 0)
    map[groupKey].totalQty += (t.qty || 0)
    if (t.source_files?.length) {
      t.source_files.forEach(f => { if (!map[groupKey].source_files.includes(f)) map[groupKey].source_files.push(f) })
    }
  })
  return Object.values(map)
}

// 判断工单+材料+组索引是否已完成
function isGroupCompleted(group) {
  const groupKey = `${group.work_order_id}|||${group.material_type}|||${group.group_index}`
  if (completedGroups.value.has(groupKey)) return true
  // 兼容旧数据：不带 group_index 的匹配
  const legacyKey = `${group.work_order_id}|||${group.material_type}`
  if (completedGroups.value.has(legacyKey)) return true
  return false
}

// 判断是否在排版中
function isTypesetting(group) {
  const groupKey = `${group.work_order_id}|||${group.material_type}|||${group.group_index}`
  return typesettingGroups.value.has(groupKey)
}

// ===== 筛选后的任务（按店铺聚合）=====
const filteredTaskShops = computed(() => {
  const groups = groupByWoMaterial(allTasks.value)
  const byShop = {}

  groups.forEach(g => {
    const woId = g.work_order_id
    const completed = isGroupCompleted(g)
    const typesetting = isTypesetting(g)

    if (!byShop[woId]) {
      byShop[woId] = {
        work_order_id: woId,
        work_order_no: g.work_order_no,
        title: g.title,
        client_name: g.client_name || '',
        activity_name: g.activity_name || '',
        materials: [],
        sourceFile: null,
        totalArea: 0,
        pendingCount: 0,
        typesettingCount: 0,
        completedCount: 0,
        isCompleted: false,
        isTypesetting: false,
      }
    }

    // 累加面积
    byShop[woId].totalArea += g.totalArea

    // 只取第一个源文件（每个店铺一个CDR）
    if (!byShop[woId].sourceFile && g.source_files?.length > 0) {
      byShop[woId].sourceFile = g.source_files[0]
    }

    // 添加材料组
    const matGroup = {
      material_type: g.material_type,
      group_name: g.group_name || '',
      faces: [],
      completed,
      typesetting,
    }
    byShop[woId].materials.push(matGroup)

    g.faces.forEach(f => {
      matGroup.faces.push({
        label: f.label || '—',
        width: f.width,
        height: f.height,
        area: (Number(f.width) || 0) * (Number(f.height) || 0),
        completed,
        typesetting,
      })
    })

    // 统计状态
    if (completed) {
      byShop[woId].completedCount++
    } else if (typesetting) {
      byShop[woId].typesettingCount++
    } else {
      byShop[woId].pendingCount++
    }
  })

  // 计算整体状态
  Object.values(byShop).forEach(shop => {
    const total = shop.pendingCount + shop.typesettingCount + shop.completedCount
    shop.isCompleted = shop.completedCount === total
    shop.isTypesetting = shop.typesettingCount > 0 && !shop.isCompleted
  })

  // 筛选
  let list = Object.values(byShop)
  if (taskSearch.value) {
    const kw = taskSearch.value.toLowerCase()
    list = list.filter(s => s.work_order_no.toLowerCase().includes(kw) || s.title.toLowerCase().includes(kw))
  }
  if (taskStatusFilter.value === 'completed') {
    list = list.filter(s => s.isCompleted)
  } else if (taskStatusFilter.value === 'typesetting') {
    list = list.filter(s => s.isTypesetting && !s.isCompleted)
  } else if (taskStatusFilter.value === 'pending') {
    list = list.filter(s => !s.isCompleted && !s.isTypesetting)
  }

  return list.sort((a, b) => b.pendingCount - a.pendingCount)
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
  const typesetting = groups.filter(g => isTypesetting(g) && !isGroupCompleted(g)).length
  stats.pending = groups.length - completed - typesetting
  stats.producing = typesetting
  stats.completed = completed
  stats.materialTypes = new Set(allTasks.value.map(t => t.material_type)).size
}

// ===== 筛选 =====
function filterTasks() {} // computed 自动响应
function filterHistory() {} // computed 自动响应

// ===== 状态显示 =====
function getShopStatusType(row) {
  if (row.isCompleted) return 'success'
  if (row.isTypesetting) return 'warning'
  return 'info'
}

function getShopStatusLabel(row) {
  if (row.isCompleted) return '已完成'
  if (row.isTypesetting) return '排版中'
  return '待生产'
}

// ===== 选择操作 =====
function handleShopSelection(selection) {
  selectedShops.value = selection
}

function clearSelection() {
  selectedShops.value = []
}

// 批量下载CDR文件
function downloadSelectedFiles() {
  const allFiles = []
  const seenFiles = new Set()

  selectedShops.value.forEach(shop => {
    if (shop.sourceFile && !seenFiles.has(shop.sourceFile)) {
      seenFiles.add(shop.sourceFile)
      allFiles.push({ url: shop.sourceFile, name: shop.sourceFile.split('/').pop() })
    }
  })

  if (!allFiles.length) {
    ElMessage.warning('选中店铺没有源文件')
    return
  }

  // 逐个下载
  allFiles.forEach(file => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  })

  ElMessage.success(`已下载 ${allFiles.length} 个文件`)
}

// 标记为排版中
function markAsTypesetting() {
  selectedShops.value.forEach(shop => {
    // 标记该店铺所有未完成的材料组为排版中
    shop.materials.forEach(mat => {
      if (!mat.completed) {
        const groupKey = `${shop.work_order_id}|||${mat.material_type}|||${mat.group_index || 0}`
        typesettingGroups.value.add(groupKey)
      }
    })
  })

  ElMessage.success(`已标记 ${selectedShops.value.length} 个店铺为排版中`)
  clearSelection()
}

// 标记店铺完成
function markShopComplete(shop) {
  // 打开核对对话框，标记该店铺所有材料完成
  const items = shop.materials.filter(m => !m.completed).map((mat, idx) => ({
    id: `${shop.work_order_id}|||${mat.material_type}|||${mat.group_index || idx}`,
    work_order_id: shop.work_order_id,
    work_order_no: shop.work_order_no,
    title: shop.title,
    faceSummary: mat.faces.map(f => f.label).join(' + '),
    area: mat.faces.reduce((sum, f) => sum + f.area, 0),
    source_files: shop.sourceFile ? [shop.sourceFile] : [],
    group_name: mat.group_name || '',
    is_unified: false,
    group_index: mat.group_index || idx,
    material_type: mat.material_type,
  }))

  if (!items.length) {
    ElMessage.warning('该店铺没有待完成的任务')
    return
  }

  verifyData.material_type = items[0].material_type
  verifyData.batch_no = '自动生成'
  verifyData.items = items
  verifyChecked.value = items.map(i => i.id)
  verifyNotes.value = ''
  verifyVisible.value = true
}

// ===== 核对流程 =====
function openVerifyDialog(materialType) {
  const items = groupByWoMaterial(allTasks.value).filter(g => g.material_type === materialType && !isGroupCompleted(g))
  if (!items.length) { ElMessage.warning('没有待生产任务'); return }
  verifyData.material_type = materialType
  verifyData.batch_no = '自动生成'
  verifyData.items = items.map(g => ({
    id: `${g.work_order_id}|||${g.material_type}|||${g.group_index}`,
    work_order_id: g.work_order_id,
    work_order_no: g.work_order_no,
    title: g.title,
    faceSummary: g.faces.map(f => f.label).join(' + '),
    area: g.totalArea,
    source_files: g.source_files,
    group_name: g.group_name || '',
    is_unified: g.is_unified || false,
    group_index: g.group_index,
    material_type: g.material_type,
  }))
  verifyChecked.value = verifyData.items.map(i => i.id)
  verifyNotes.value = ''
  verifyVisible.value = true
}

function startVerifyGroup(group) {
  verifyData.material_type = group.material_type
  verifyData.batch_no = '自动生成'
  verifyData.items = [{
    id: `${group.work_order_id}|||${group.material_type}|||${group.group_index}`,
    work_order_id: group.work_order_id,
    work_order_no: group.work_order_no,
    title: group.title,
    faceSummary: group.faces.map(f => f.label).join(' + '),
    area: group.totalArea,
    source_files: group.source_files,
    group_name: group.group_name || '',
    is_unified: group.is_unified || false,
    group_index: group.group_index,
    material_type: group.material_type,
  }]
  verifyChecked.value = verifyData.items.map(i => i.id)
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
    checked: verifyChecked.value.includes(item.id),
    group_name: item.group_name || '',
    is_unified: item.is_unified || false,
    group_index: item.group_index,
    material_type: item.material_type,
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
        const groupKey = `${item.work_order_id}|||${item.material_type}|||${item.group_index}`
        completedGroups.value.add(groupKey)
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

// 导出生产单
function exportProductionSheet(matGroup) {
  const materialLabel = adTypeLabel(matGroup.material_type)
  const today = new Date().toISOString().slice(0, 10)

  // 按工单聚合（一个店铺一行）
  const woMap = {}
  matGroup.items.forEach(item => {
    const woId = item.work_order_id
    if (!woMap[woId]) {
      woMap[woId] = {
        title: item.title,
        work_order_no: item.work_order_no,
        activity_name: item.activity_name || '',
        client_name: item.client_name || '',
        materials: [],
        totalArea: 0,
        totalQty: 0,
        pointCount: 0,
      }
    }
    // 材料类型（去重）
    const matLabel = adTypeLabel(item.material_type)
    if (!woMap[woId].materials.includes(matLabel)) {
      woMap[woId].materials.push(matLabel)
    }
    // 统计面积、数量、点位
    woMap[woId].totalArea += item.totalArea
    woMap[woId].totalQty += item.totalQty
    woMap[woId].pointCount += item.faces.length
  })

  const shops = Object.values(woMap)

  // 构建导出数据
  const rows = [
    ['生产单', '', '', '', '', '', '', ''],
    ['材料类型', materialLabel, '', '导出日期', today, '', '', ''],
    ['序号', '店名', '元素', '项目', '点位', '材质', '数量', '面积'],
  ]

  let totalArea = 0
  let totalQty = 0

  shops.forEach((shop, idx) => {
    // 材质用序号区分：1.软膜灯箱 2.KT板
    const matStr = shop.materials.map((m, i) => `${i + 1}.${m}`).join('  ')

    rows.push([
      idx + 1,              // 序号
      shop.title,           // 店名
      shop.client_name,     // 元素（甲方名称）
      shop.activity_name,   // 项目
      shop.pointCount,      // 点位
      matStr,               // 材质
      shop.totalQty || '',  // 数量
      shop.totalArea.toFixed(2), // 面积
    ])

    totalArea += shop.totalArea
    totalQty += (shop.totalQty || 0)
  })

  // 添加合计行
  rows.push(['', '合计', '', '', '', '', totalQty, totalArea.toFixed(2)])
  rows.push(['', '', '', '', '', '', '', ''])
  rows.push(['制单人：', '', '审核：', '', '生产日期：', '', '', ''])

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // 设置列宽
  ws['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 20 },  // 店名
    { wch: 10 },  // 元素
    { wch: 14 },  // 项目
    { wch: 6 },   // 点位
    { wch: 30 },  // 材质
    { wch: 8 },   // 数量
    { wch: 10 },  // 面积
  ]

  // 设置边框样式
  const borderStyle = {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[cellAddr]) ws[cellAddr] = { v: '' }
      ws[cellAddr].s = borderStyle
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '生产单')

  // 下载文件
  const fileName = `生产单_${materialLabel}_${today}.xlsx`
  XLSX.writeFile(wb, fileName)

  ElMessage.success(`已导出 ${shops.length} 个店铺的生产单`)
}

// 导出选中的店铺
function exportSelectedShops() {
  if (!selectedShops.value.length) {
    ElMessage.warning('请先选择店铺')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows = [
    ['生产单', '', '', '', '', '', '', ''],
    ['导出日期', today, '', '选中店铺', selectedShops.value.length, '', '', ''],
    ['序号', '店名', '元素', '项目', '点位', '材质', '数量', '面积'],
  ]

  let totalArea = 0
  let totalQty = 0

  selectedShops.value.forEach((shop, idx) => {
    const pointCount = shop.materials.reduce((sum, m) => sum + m.faces.length, 0)
    const matStr = shop.materials.map((m, i) => `${i + 1}.${adTypeLabel(m.material_type)}`).join('  ')

    rows.push([
      idx + 1,
      shop.title,
      shop.client_name,
      shop.activity_name,
      pointCount,
      matStr,
      '', // 数量
      shop.totalArea.toFixed(2),
    ])

    totalArea += shop.totalArea
  })

  rows.push(['', '合计', '', '', '', '', '', totalArea.toFixed(2)])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 10 },
    { wch: 14 },
    { wch: 6 },
    { wch: 30 },
    { wch: 8 },
    { wch: 10 },
  ]

  // 设置边框
  const borderStyle = {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[cellAddr]) ws[cellAddr] = { v: '' }
      ws[cellAddr].s = borderStyle
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '生产单')
  const fileName = `生产单_选中${selectedShops.value.length}店_${today}.xlsx`
  XLSX.writeFile(wb, fileName)

  ElMessage.success(`已导出 ${selectedShops.value.length} 个店铺`)
}

// 导出全部待生产任务（按材料分 Sheet）
function exportAllTasks() {
  const pending = boardMaterials.value
  if (!pending.length) {
    ElMessage.warning('没有待生产任务')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const wb = XLSX.utils.book_new()

  let totalShops = 0

  pending.forEach(matGroup => {
    const materialLabel = adTypeLabel(matGroup.material_type) || '未分类'

    // 按工单聚合
    const woMap = {}
    matGroup.items.forEach(item => {
      const woId = item.work_order_id
      if (!woMap[woId]) {
        woMap[woId] = {
          title: item.title,
          work_order_no: item.work_order_no,
          activity_name: item.activity_name || '',
          client_name: item.client_name || '',
          materials: [],
          totalArea: 0,
          totalQty: 0,
          pointCount: 0,
        }
      }
      const matLabel = adTypeLabel(item.material_type)
      if (!woMap[woId].materials.includes(matLabel)) {
        woMap[woId].materials.push(matLabel)
      }
      woMap[woId].totalArea += item.totalArea
      woMap[woId].totalQty += item.totalQty
      woMap[woId].pointCount += item.faces.length
    })

    const shops = Object.values(woMap)
    totalShops += shops.length

    // 每个 Sheet 的数据
    const rows = [
      ['生产单', '', '', '', '', '', '', ''],
      ['材料类型', materialLabel, '', '导出日期', today, '', '', ''],
      ['序号', '店名', '元素', '项目', '点位', '材质', '数量', '面积'],
    ]

    let totalArea = 0
    let totalQty = 0

    shops.forEach((shop, idx) => {
      const matStr = shop.materials.map((m, i) => `${i + 1}.${m}`).join('  ')

      rows.push([
        idx + 1,
        shop.title,
        shop.client_name,
        shop.activity_name,
        shop.pointCount,
        matStr,
        shop.totalQty || '',
        shop.totalArea.toFixed(2),
      ])

      totalArea += shop.totalArea
      totalQty += (shop.totalQty || 0)
    })

    rows.push(['', '合计', '', '', '', '', totalQty, totalArea.toFixed(2)])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 6 },
      { wch: 30 },
      { wch: 8 },
      { wch: 10 },
    ]

    // 设置边框
    const borderStyle = {
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[cellAddr]) ws[cellAddr] = { v: '' }
        ws[cellAddr].s = borderStyle
      }
    }

    // Sheet 名称不超过 31 字符
    const sheetName = materialLabel.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  // 下载文件
  const fileName = `生产单_全部_${today}.xlsx`
  XLSX.writeFile(wb, fileName)

  ElMessage.success(`已导出 ${totalShops} 个店铺，按 ${pending.length} 种材料分 Sheet`)
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

.batch-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
}
.batch-info { font-size: 13px; color: var(--color-text-secondary); }

.file-links { display: flex; flex-direction: column; gap: 2px; }
.file-link { font-size: 11px; color: var(--color-primary); text-decoration: none; }
.file-link:hover { text-decoration: underline; }

.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }

.face-list { display: flex; flex-direction: column; gap: 2px; }
.face-item { font-size: 12px; color: var(--color-text-secondary); }
.qty-item { color: var(--color-primary); font-weight: 600; margin-top: 4px; display: block; }
.face-inline { display: inline-block; font-size: 12px; color: var(--color-text-secondary); margin-right: 8px; }
.face-inline.qty-item { color: var(--color-primary); font-weight: 600; }

.material-group-header { display: flex; justify-content: space-between; align-items: center; }
.material-title { font-weight: 700; font-size: 15px; color: var(--color-primary); }
.material-count { font-size: 12px; color: var(--color-text-secondary); margin-left: 8px; }
.material-actions { display: flex; gap: 8px; }

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

/* 生产任务展开 */
.shop-expand-content { padding: 0 20px 10px; }
.shop-material-group { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
.shop-material-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.shop-material-title { font-weight: 600; font-size: 13px; color: var(--color-primary); margin-bottom: 6px; }
.shop-group-name { font-weight: normal; font-size: 12px; color: var(--color-text-secondary); margin-left: 4px; }
.shop-face-row { display: flex; align-items: center; gap: 16px; padding: 3px 0; font-size: 12px; }
.face-label { color: var(--color-text-primary); min-width: 50px; }
.face-size { color: var(--color-text-secondary); }
.face-area { color: var(--color-text-secondary); }
.material-tag { font-size: 12px; color: var(--color-text-secondary); }
</style>
