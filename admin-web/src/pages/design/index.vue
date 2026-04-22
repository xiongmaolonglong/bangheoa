<template>
  <div class="design-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        设计管理
        <span>方案设计与审核</span>
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
      <div class="stat-card" :class="{ active: filterForm.status === 'designing' }" @click="filterByStatus('designing')">
        <div class="stat-icon designing">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.designing }}</div>
          <div class="stat-label">设计中</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'design_review' }" @click="filterByStatus('design_review')">
        <div class="stat-icon review">
          <el-icon><Checked /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.review }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: filterForm.status === 'producing' }" @click="filterByStatus('producing')">
        <div class="stat-icon done">
          <el-icon><Finished /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.done }}</div>
          <div class="stat-label">已完成</div>
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
        <span class="chip" :class="{ active: filterForm.status === 'designing' }" @click="filterByStatus('designing')">设计中 <span class="chip-count">{{ stats.designing }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'design_review' }" @click="filterByStatus('design_review')">待审核 <span class="chip-count">{{ stats.review }}</span></span>
        <span class="chip" :class="{ active: filterForm.status === 'producing' }" @click="filterByStatus('producing')">已完成 <span class="chip-count">{{ stats.done }}</span></span>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list" v-loading="loading">
      <div
        v-for="row in taskList"
        :key="row.id"
        class="task-card"
        :class="{ urgent: isUrgent(row), done: isDoneStatus(row.status) }"
        @click="handleDesign(row)"
      >
        <div class="task-status" :class="getStatusClass(row.status)"></div>
        <div class="task-info">
          <div class="task-top">
            <span class="task-order-no">{{ row.order_no }}</span>
            <span class="task-status-badge" :class="getStatusClass(row.status)">
              <span class="task-status-dot"></span>
              {{ getStatusText(row.status) }}
            </span>
            <span v-if="isUrgent(row)" class="task-urgent-badge">紧急</span>
          </div>
          <div class="task-meta">
            <span class="task-meta-item">
              <el-icon><User /></el-icon>
              <strong>{{ row.customer?.real_name || row.form_data?.company || '-' }}</strong>
              {{ row.customer?.phone ? ' · ' + row.customer.phone : '' }}
            </span>
            <span class="task-meta-item">
              <el-icon><Location /></el-icon>
              {{ row.form_data?.address || '-' }}
            </span>
          </div>
          <div class="task-duration" v-if="row.status === 'designing'">
            <span class="duration-badge" :class="getDurationClass(row)">
              <el-icon><Clock /></el-icon>
              已耗时 {{ getDuration(row) }}
            </span>
            <span class="duration-hint">{{ getDesignHint(row) }}</span>
          </div>
          <div class="task-duration" v-else>
            <span class="duration-hint">{{ getDesignHint(row) }}</span>
          </div>
        </div>
        <div class="task-side">
          <div class="task-designer">设计师：<strong>{{ row.handler?.real_name || row.designer?.real_name || '-' }}</strong></div>
          <div class="task-created">{{ formatShortDate(row.created_at) }}</div>
        </div>
        <div class="task-actions" @click.stop>
          <el-button size="small" @click="handleDesign(row)">详情</el-button>
          <el-button v-if="row.status === 'designing'" class="task-btn primary" size="small" @click="handleDesign(row)">
            <el-icon><EditPen /></el-icon>
            设计
          </el-button>
          <el-button v-if="row.status === 'design_review'" class="task-btn success" size="small" @click="handleApprove(row)">
            <el-icon><Check /></el-icon>
            审核通过
          </el-button>
        </div>
      </div>

      <el-empty v-if="!loading && taskList.length === 0" description="暂无设计任务" :image-size="80" />
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
import { Refresh, Briefcase, EditPen, Checked, Finished, User, Location, Clock, Check } from '@element-plus/icons-vue'
import { designApi } from '@/api'
import dayjs from 'dayjs'
import { formatShortDate } from '@/composables/useFormat'

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
  designing: 0,
  review: 0,
  done: 0
})

const statusMap = {
  pending_review: { text: '待审核', class: 'review' },
  designing: { text: '设计中', class: 'designing' },
  design_review: { text: '待审核', class: 'review' },
  producing: { text: '已完成', class: 'done' },
  checking: { text: '生产中', class: 'done' },
  installing: { text: '已交付安装', class: 'done' },
  install_review: { text: '安装审核', class: 'done' },
  archived: { text: '已归档', class: 'done' },
  rejected: { text: '已驳回', class: 'designing' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusClass = (status) => statusMap[status]?.class || 'designing'
const isDoneStatus = (status) => ['producing', 'checking', 'installing', 'install_review', 'archived'].includes(status)

const isUrgent = (row) => {
  if (row.status !== 'designing') return false
  const hours = dayjs().diff(dayjs(row.created_at), 'hour')
  return hours >= 48
}

const getDuration = (row) => {
  const hours = dayjs().diff(dayjs(row.created_at), 'hour')
  if (hours >= 24) return `${Math.floor(hours / 24)}d`
  if (hours > 0) return `${hours}h`
  return 'now'
}

const getDurationClass = (row) => {
  const hours = dayjs().diff(dayjs(row.created_at), 'hour')
  if (hours >= 72) return 'critical'
  if (hours >= 24) return 'warning'
  return 'normal'
}

const getDesignHint = (row) => {
  if (row.status === 'designing') {
    const adTypes = getAdTypes(row)
    const faceCount = getFaceCount(row)
    return `${adTypes} · ${faceCount}面`
  }
  if (row.status === 'design_review') {
    const adTypes = getAdTypes(row)
    const faceCount = getFaceCount(row)
    return `${adTypes} · ${faceCount}面 · 设计已提交`
  }
  if (isDoneStatus(row.status)) {
    const time = dayjs(row.updated_at || row.created_at).format('MM-DD')
    return `已进入生产 · ${time}`
  }
  return ''
}

const getAdTypes = (row) => {
  const types = new Set()
  row.adItems?.forEach(item => {
    if (item.ad_type_name) types.add(item.ad_type_name)
  })
  return types.size > 0 ? Array.from(types).join(' + ') : '-'
}

const getFaceCount = (row) => {
  let count = 0
  row.adItems?.forEach(item => {
    count += item.faces?.length || 0
  })
  return count
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const res = await designApi.getTasks({
      ...filterForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    taskList.value = res.data?.list || []
    pagination.total = res.data?.total || 0

    stats.total = res.data?.total || 0
    try {
      const allRes = await designApi.getTasks({ status: 'designing', page: 1, pageSize: 1 })
      stats.designing = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await designApi.getTasks({ status: 'design_review', page: 1, pageSize: 1 })
      stats.review = allRes.data?.total || 0
    } catch {}
    try {
      const allRes = await designApi.getTasks({ status: 'producing', page: 1, pageSize: 1 })
      stats.done = allRes.data?.total || 0
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

const handleDesign = (row) => {
  router.push(`/design/${row.id}`)
}

const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm('确定审核通过该设计方案吗？', '审核确认', { type: 'warning' })
    await designApi.approve(row.id)
    ElMessage.success('审核通过')
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
.design-page {
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
.stat-icon.designing { background: #3b82f6; }
.stat-icon.review { background: #f59e0b; }
.stat-icon.done { background: #10b981; }
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
.task-card.urgent { border-left: 3px solid #ef4444; }
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
.task-status.designing { background: #3b82f6; }
.task-status.review { background: #f59e0b; }
.task-status.done { background: #10b981; }

.task-info { flex: 1; min-width: 0; }
.task-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
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
.task-status-badge.designing { background: var(--blue-bg); color: var(--blue); }
.task-status-badge.review { background: var(--amber-bg); color: var(--amber); }
.task-status-badge.done { background: var(--green-bg); color: var(--green); }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.task-status-badge.designing .task-status-dot { background: var(--blue); }
.task-status-badge.review .task-status-dot { background: var(--amber); }
.task-status-badge.done .task-status-dot { background: var(--green); }

.task-urgent-badge {
  font-size: 10px;
  font-weight: 700;
  color: #ef4444;
  background: #fef2f2;
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.5px;
}

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

.task-duration {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.duration-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
  font-size: 11px;
}
.duration-badge .el-icon { width: 12px; height: 12px; }
.duration-badge.normal { background: var(--blue-bg); color: var(--blue); }
.duration-badge.warning { background: var(--amber-bg); color: var(--amber); }
.duration-badge.critical { background: #fef2f2; color: #ef4444; }
.duration-hint {
  color: var(--text-secondary);
}

.task-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.task-designer { font-size: 12px; color: var(--text-secondary); }
.task-designer strong { color: var(--text-primary); font-weight: 600; }
.task-created { font-size: 11px; color: var(--text-secondary); }

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
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}
.task-btn.success:hover {
  background: #059669;
  border-color: #059669;
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
