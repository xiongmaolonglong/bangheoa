<template>
  <div class="install-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        安装管理
        <span>安装任务与审核</span>
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
      <div class="stat-card" :class="{ active: filterForm.status === 'installing' }" @click="filterByStatus('installing')">
        <div class="stat-icon pending">
          <el-icon><Tools /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.installing }}</div>
          <div class="stat-label">待安装</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'install_review' }" @click="filterByStatus('install_review')">
        <div class="stat-icon review">
          <el-icon><Checked /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.review }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'archived' }" @click="filterByStatus('archived')">
        <div class="stat-icon archived">
          <el-icon><Finished /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.archived }}</div>
          <div class="stat-label">已归档</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="filterForm.keyword"
        type="text"
        class="search-input"
        placeholder="搜索订单号、客户姓名或电话..."
        @keyup.enter="handleSearch"
      >
      <div class="filter-chips">
        <span class="chip" :class="{ active: filterForm.status === '' }" @click="filterByStatus('')">全部 <span class="chip-count">{{ stats.total }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'installing' }" @click="filterByStatus('installing')">待安装 <span class="chip-count">{{ stats.installing }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'install_review' }" @click="filterByStatus('install_review')">待审核 <span class="chip-count">{{ stats.review }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'archived' }" @click="filterByStatus('archived')">已归档 <span class="chip-count">{{ stats.archived }}</span></span>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list" v-loading="loading">
      <div
        v-for="row in taskList"
        :key="row.id"
        class="task-card"
        :class="{ archived: row.status === 'archived' }"
        @click="handleView(row)"
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
              <strong>{{ row.customer?.real_name || row.customer_name || '-' }}</strong>
              {{ row.customer?.phone || row.customer_phone ? ' · ' + (row.customer?.phone || row.customer_phone) : '' }}
            </span>
            <span class="task-meta-item">
              <el-icon><Location /></el-icon>
              {{ row.form_data?.address || row.form_data?.company || row.address || '-' }}
            </span>
          </div>
          <div class="task-time">{{ getTaskTimeText(row) }}</div>
        </div>
        <div class="task-actions" @click.stop>
          <el-button v-if="row.status === 'installing'" class="task-btn primary" size="small" @click="handleInstall(row)">
            <el-icon><EditPen /></el-icon>
            填写报告
          </el-button>
          <el-button v-if="row.status === 'install_review'" class="task-btn success" size="small" @click="handleApprove(row)">
            <el-icon><Check /></el-icon>
            审核通过
          </el-button>
          <el-button size="small" @click="handleView(row)">详情</el-button>
        </div>
      </div>

      <el-empty v-if="!loading && taskList.length === 0" description="暂无安装任务" :image-size="80" />
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
import { Refresh, Briefcase, Tools, Checked, Finished, User, Location, EditPen, Check } from '@element-plus/icons-vue'
import { installApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const taskList = ref([])

const filterForm = reactive({
  status: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const stats = reactive({
  total: 0,
  installing: 0,
  review: 0,
  archived: 0
})

const statusMap = {
  pending_review: { text: '待审核', class: 'pending' },
  designing: { text: '设计中', class: 'pending' },
  design_review: { text: '设计审核', class: 'pending' },
  producing: { text: '生产中', class: 'pending' },
  checking: { text: '待核对', class: 'pending' },
  installing: { text: '待安装', class: 'pending' },
  install_review: { text: '待审核', class: 'review' },
  archived: { text: '已归档', class: 'archived' },
  rejected: { text: '已驳回', class: 'pending' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusClass = (status) => statusMap[status]?.class || 'pending'

const getTaskTimeText = (row) => {
  const time = formatDate(row.updated_at || row.created_at)
  if (row.status === 'installing') return `等待安装 · ${time}`
  if (row.status === 'install_review') return `安装报告已提交 · ${time}`
  if (row.status === 'archived') return `已归档 · ${time}`
  return time
}

const formatDate = (date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'

const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await installApi.getTasks({
      ...filterForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    taskList.value = res.data?.list || []
    pagination.total = res.data?.total || 0

    // 统计数据
    stats.total = res.data?.total || 0
    try {
      const allRes = await installApi.getTasks({ status: 'installing', page: 1, pageSize: 1 })
      stats.installing = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await installApi.getTasks({ status: 'install_review', page: 1, pageSize: 1 })
      stats.review = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await installApi.getTasks({ status: 'archived', page: 1, pageSize: 1 })
      stats.archived = allRes.data?.total || 0
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
  filterForm.status = ''
  filterForm.keyword = ''
  handleSearch()
}

const handleInstall = (row) => {
  router.push(`/install/${row.id}/report`)
}

const handleView = (row) => {
  router.push(`/install/${row.id}`)
}

const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm('确定审核通过该安装报告吗？', '审核确认', { type: 'warning' })
    await installApi.approve(row.id)
    ElMessage.success('审核通过，订单已归档')
    fetchTasks()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('审核失败')
    }
  }
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.install-page {
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
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-icon.pending { background: #6366f1; }
.stat-icon.review { background: #f59e0b; }
.stat-icon.archived { background: #10b981; }
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
  border-radius: 8px;
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
.task-card.archived { opacity: 0.75; }
.task-card.archived:hover { opacity: 1; }

.task-status {
  width: 4px;
  height: 100%;
  min-height: 56px;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
}
.task-status.pending { background: var(--brand-primary); }
.task-status.review { background: var(--amber); }
.task-status.archived { background: var(--green); }

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
.task-status-badge.pending { background: var(--brand-primary-light); color: var(--brand-primary); }
.task-status-badge.review { background: var(--amber-bg); color: var(--amber); }
.task-status-badge.archived { background: var(--green-bg); color: var(--green); }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.task-status-badge.pending .task-status-dot { background: var(--brand-primary); }
.task-status-badge.review .task-status-dot { background: var(--amber); }
.task-status-badge.archived .task-status-dot { background: var(--green); }

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

.task-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

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
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.task-btn.primary:hover {
  background: var(--brand-primary-hover);
  border-color: var(--brand-primary-hover);
}
.task-btn.success {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
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
