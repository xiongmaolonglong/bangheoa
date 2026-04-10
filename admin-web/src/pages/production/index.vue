<template>
  <div class="production-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        生产管理
        <span>生产进度与核对</span>
      </div>
      <div class="page-actions">
        <el-button @click="fetchTasks">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ active: filterForm.status === '' }" @click="filterByStatus('')">
        <div class="stat-icon total">
          <el-icon><Briefcase /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部任务</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'producing' }" @click="filterByStatus('producing')">
        <div class="stat-icon producing">
          <el-icon><Setting /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.producing }}</div>
          <div class="stat-label">生产中</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'checking' }" @click="filterByStatus('checking')">
        <div class="stat-icon checking">
          <el-icon><Checked /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.checking }}</div>
          <div class="stat-label">待核对</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'installing' }" @click="filterByStatus('installing')">
        <div class="stat-icon installing">
          <el-icon><Finished /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.installing }}</div>
          <div class="stat-label">已交付安装</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="filterForm.keyword"
        type="text"
        class="search-input"
        placeholder="搜索订单编号、客户..."
        @keyup.enter="handleSearch"
      >
      <div class="filter-chips">
        <span class="chip" :class="{ active: filterForm.status === '' }" @click="filterByStatus('')">全部 <span class="chip-count">{{ stats.total }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'producing' }" @click="filterByStatus('producing')">生产中 <span class="chip-count">{{ stats.producing }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'checking' }" @click="filterByStatus('checking')">待核对 <span class="chip-count">{{ stats.checking }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'installing' }" @click="filterByStatus('installing')">已交付 <span class="chip-count">{{ stats.installing }}</span></span>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list" v-loading="loading">
      <div
        v-for="row in taskList"
        :key="row.id"
        class="task-card"
        :class="{ done: isDoneStatus(row.status) }"
        @click="handleDetail(row)"
      >
        <div class="task-status" :class="getStatusClass(row.status)"></div>
        <div class="task-info">
          <div class="task-top">
            <span class="task-order-no">{{ row.order_no }}</span>
            <span class="task-status-badge" :class="getStatusClass(row.status)">
              <span class="task-status-dot"></span>
              {{ getStatusText(row.status) }}
            </span>
          </div>
          <div class="task-meta">
            <span class="task-meta-item">
              <el-icon><User /></el-icon>
              <strong>{{ row.customer?.real_name || row.form_data?.company || '-' }}</strong>
              {{ row.customer?.phone ? ' · ' + row.customer.phone : '' }}
            </span>
            <span class="task-meta-item">
              <el-icon><Location /></el-icon>
              {{ row.form_data?.address || row.address || '-' }}
            </span>
          </div>
          <div class="task-progress">
            <div class="progress-bar"><div class="progress-fill" :class="getProgressColorClass(row)" :style="{ width: getProgress(row) + '%' }"></div></div>
            <span class="progress-text">{{ getProgress(row) }}%</span>
            <span class="progress-hint">{{ getProgressHint(row) }}</span>
          </div>
        </div>
        <div class="task-side">
          <div class="task-materials"><strong>{{ getFaceCount(row) }}</strong> 面</div>
          <div class="task-area">{{ calculateArea(row) }}㎡</div>
          <div class="task-producer">生产员：{{ row.handler?.real_name || '-' }}</div>
        </div>
        <div class="task-actions" @click.stop>
          <el-button size="small" @click="handleDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'producing'" class="task-btn primary" size="small" @click="handleComplete(row)">
            <el-icon><Check /></el-icon>
            完成生产
          </el-button>
          <el-button v-if="row.status === 'checking'" class="task-btn success" size="small" @click="handleCheck(row)">
            <el-icon><Checked /></el-icon>
            核对
          </el-button>
        </div>
      </div>

      <el-empty v-if="!loading && taskList.length === 0" description="暂无生产任务" :image-size="80" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchTasks"
        @current-change="fetchTasks"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Briefcase, Setting, Checked, Finished, User, Location, Check } from '@element-plus/icons-vue'
import { productionApi, userApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const taskList = ref([])
const producers = ref([])

const filterForm = reactive({
  status: '',
  keyword: '',
  producer_id: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const stats = reactive({
  total: 0,
  producing: 0,
  checking: 0,
  installing: 0
})

const statusMap = {
  pending_review: { text: '待审核', class: 'producing' },
  designing: { text: '设计中', class: 'producing' },
  design_review: { text: '设计审核', class: 'producing' },
  producing: { text: '生产中', class: 'producing' },
  checking: { text: '待核对', class: 'checking' },
  installing: { text: '已交付安装', class: 'done' },
  install_review: { text: '安装审核', class: 'done' },
  archived: { text: '已归档', class: 'done' },
  rejected: { text: '已驳回', class: 'producing' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusClass = (status) => statusMap[status]?.class || 'producing'
const isDoneStatus = (status) => ['installing', 'install_review', 'archived'].includes(status)

const getProgress = (row) => {
  const faces = getFacesFromOrder(row)
  if (!faces || faces.length === 0) return 0

  if (row.status === 'producing') {
    const completed = faces.filter(f => f.production_status === 'completed').length
    return Math.round((completed / faces.length) * 100)
  } else if (row.status === 'checking') {
    const passed = faces.filter(f => f.check_status === 'passed').length
    return Math.round((passed / faces.length) * 100)
  }
  return 100
}

const getProgressColorClass = (row) => {
  if (row.status === 'checking') return 'amber'
  if (isDoneStatus(row.status)) return 'green'
  return 'blue'
}

const getProgressHint = (row) => {
  const faces = getFacesFromOrder(row)
  if (!faces || faces.length === 0) return ''

  if (row.status === 'producing') {
    const completed = faces.filter(f => f.production_status === 'completed').length
    return `${completed}/${faces.length} 面已完成`
  } else if (row.status === 'checking') {
    const passed = faces.filter(f => f.check_status === 'passed').length
    return `${passed}/${faces.length} 面已核对`
  } else if (isDoneStatus(row.status)) {
    const time = dayjs(row.updated_at || row.created_at).format('MM-DD')
    return `生产完成 · 已交付安装 · ${time}`
  }
  return ''
}

const getFacesFromOrder = (order) => {
  const faces = []
  order.adItems?.forEach(item => {
    item.faces?.forEach(face => faces.push(face))
  })
  return faces
}

const getFaceCount = (order) => {
  let count = 0
  order.adItems?.forEach(item => {
    count += item.faces?.length || 0
  })
  return count
}

const calculateArea = (order) => {
  let total = 0
  order.adItems?.forEach(item => {
    item.faces?.forEach(face => {
      if (face.width && face.height) {
        total += (face.width * face.height) / 10000
      }
    })
  })
  return total.toFixed(2)
}

const fetchProducers = async () => {
  try {
    const res = await userApi.getList({ role: 'producer' })
    producers.value = res.data?.list || []
  } catch (err) {
    console.error(err)
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await productionApi.getTasks({
      ...filterForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    taskList.value = res.data?.list || []
    pagination.total = res.data?.total || 0

    stats.total = res.data?.total || 0
    try {
      const allRes = await productionApi.getTasks({ status: 'producing', page: 1, pageSize: 1 })
      stats.producing = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await productionApi.getTasks({ status: 'checking', page: 1, pageSize: 1 })
      stats.checking = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await productionApi.getTasks({ status: 'installing', page: 1, pageSize: 1 })
      stats.installing = allRes.data?.total || 0
    } catch {}
  } catch (err) {
    console.error(err)
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const filterByStatus = (status) => {
  filterForm.status = status
  pagination.page = 1
  fetchTasks()
}

const handleSearch = () => {
  pagination.page = 1
  fetchTasks()
}

const handleReset = () => {
  filterForm.keyword = ''
  filterForm.status = ''
  filterForm.producer_id = ''
  handleSearch()
}

const handleDetail = (row) => {
  router.push(`/production/${row.id}`)
}

const handleComplete = async (row) => {
  try {
    await ElMessageBox.confirm('确认完成生产并提交核对？', '完成生产', { type: 'warning' })
    submitting.value = true
    await productionApi.complete(row.id)
    ElMessage.success('已提交核对')
    fetchTasks()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleCheck = (row) => {
  router.push(`/production/${row.id}`)
}

onMounted(() => {
  fetchProducers()
  fetchTasks()
})
</script>

<style scoped>
.production-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ===== 页面标题 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
}
.page-title span {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 8px;
}

/* ===== 统计卡片 ===== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.stat-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  transform: translateY(-1px);
}
.stat-card.active {
  border-color: var(--brand-primary);
  background: var(--brand-primary-light);
}
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-icon.producing { background: #3b82f6; }
.stat-icon.checking { background: #f59e0b; }
.stat-icon.installing { background: #10b981; }
.stat-icon.total { background: #64748b; }
.stat-info { flex: 1; }
.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.search-input {
  flex: 1;
  max-width: 300px;
  padding: 8px 12px 8px 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--card-bg);
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--brand-primary); }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  padding: 6px 14px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.chip:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.chip.active {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.chip-count {
  display: inline-block;
  background: rgba(0,0,0,0.08);
  padding: 0 5px;
  border-radius: 99px;
  font-size: 10px;
  margin-left: 4px;
}
.chip.active .chip-count { background: rgba(255,255,255,0.3); }

/* ===== 任务卡片 ===== */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
  cursor: pointer;
}
.task-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  transform: translateX(4px);
}
.task-card.done { opacity: 0.75; }
.task-card.done:hover { opacity: 1; }

.task-status {
  width: 4px;
  height: 100%;
  min-height: 56px;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
}
.task-status.producing { background: #3b82f6; }
.task-status.checking { background: #f59e0b; }
.task-status.done { background: #10b981; }

.task-info { flex: 1; min-width: 0; }
.task-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.task-order-no {
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}
.task-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}
.task-status-badge.producing { background: var(--blue-bg); color: var(--blue); }
.task-status-badge.checking { background: var(--amber-bg); color: var(--amber); }
.task-status-badge.done { background: var(--green-bg); color: var(--green); }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.task-status-badge.producing .task-status-dot { background: var(--blue); }
.task-status-badge.checking .task-status-dot { background: var(--amber); }
.task-status-badge.done .task-status-dot { background: var(--green); }

.task-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}
.task-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-meta-item .el-icon { opacity: 0.6; }
.task-meta-item strong { color: var(--text-primary); font-weight: 600; }

.task-progress {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-bar {
  flex: 1;
  max-width: 200px;
  height: 6px;
  background: var(--bg-tertiary, #f1f5f9);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.progress-fill.blue { background: #3b82f6; }
.progress-fill.amber { background: #f59e0b; }
.progress-fill.green { background: #10b981; }
.progress-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 32px;
}
.progress-hint {
  font-size: 11px;
  color: var(--text-secondary);
}

.task-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.task-materials { font-size: 12px; color: var(--text-secondary); }
.task-materials strong { color: var(--text-primary); font-weight: 700; font-size: 18px; }
.task-area { font-size: 11px; color: var(--brand-primary); font-weight: 600; }
.task-producer { font-size: 11px; color: var(--text-secondary); }

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.task-btn {
  font-size: 12px;
  font-weight: 500;
}
.task-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.task-btn.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}
.task-btn.success {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
}
.task-btn.success:hover {
  background: #d97706;
  border-color: #d97706;
}

/* ===== 分页 ===== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .task-card { flex-wrap: wrap; }
  .task-side { width: 100%; flex-direction: row; justify-content: space-between; }
  .task-actions { width: 100%; justify-content: flex-end; }
}
@media (max-width: 600px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100%; }
  .filter-chips { overflow-x: auto; }
  .task-meta { flex-direction: column; gap: 4px; }
}
</style>
