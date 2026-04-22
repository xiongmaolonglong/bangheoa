<template>
  <div class="order-list-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        订单管理
        <span>全部订单与流程跟踪</span>
      </div>
      <div class="page-actions">
        <el-button @click="handleExport" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" @click="$router.push('/orders/create')">
          <el-icon><Plus /></el-icon>
          新建订单
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ active: activeStatus === '' }" @click="filterByStatus('')">
        <div class="stat-icon total">
          <el-icon><Briefcase /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部订单</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'pending_review' }" @click="filterByStatus('pending_review')">
        <div class="stat-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'designing' }" @click="filterByStatus('designing')">
        <div class="stat-icon designing">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.designing }}</div>
          <div class="stat-label">设计中</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'producing' }" @click="filterByStatus('producing')">
        <div class="stat-icon producing">
          <el-icon><Setting /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.producing }}</div>
          <div class="stat-label">生产中</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'installing' }" @click="filterByStatus('installing')">
        <div class="stat-icon installing">
          <el-icon><Tools /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.installing }}</div>
          <div class="stat-label">安装中</div>
        </div>
      </div>
    </div>

    <!-- 流程概览 -->
    <div class="flow-bar">
      <span class="flow-bar-label">流程</span>
      <span class="flow-step"><span class="flow-dot pending"></span><span class="flow-step-label">待审核</span><span class="flow-step-count">{{ flowStats.pending }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot designing"></span><span class="flow-step-label">设计中</span><span class="flow-step-count">{{ flowStats.designing }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot producing"></span><span class="flow-step-label">生产中</span><span class="flow-step-count">{{ flowStats.producing }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot installing"></span><span class="flow-step-label">安装中</span><span class="flow-step-count">{{ flowStats.installing }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot archived"></span><span class="flow-step-label">已归档</span><span class="flow-step-count">{{ flowStats.archived }}</span></span>
    </div>

    <!-- 面积统计 -->
    <div class="area-bar">
      <span class="area-stat">
        <span class="area-stat-label">本月面积</span>
        <span class="area-stat-value">{{ areaStats.month }}</span>
        <span class="area-stat-unit">㎡</span>
      </span>
      <span class="area-stat">
        <span class="area-stat-label">本年面积</span>
        <span class="area-stat-value">{{ areaStats.year }}</span>
        <span class="area-stat-unit">㎡</span>
      </span>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="filterForm.keyword"
        type="text"
        class="search-input"
        placeholder="搜索订单号/客户/标题..."
        @keyup.enter="handleSearch"
      >
      <div class="filter-chips">
        <span class="chip" :class="{ active: activeStatus === '' }" @click="filterByStatus('')">全部 <span class="chip-count">{{ stats.total }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'pending_review' }" @click="filterByStatus('pending_review')">待审核 <span class="chip-count">{{ stats.pending }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'designing' }" @click="filterByStatus('designing')">设计中 <span class="chip-count">{{ stats.designing }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'producing' }" @click="filterByStatus('producing')">生产中 <span class="chip-count">{{ stats.producing }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'installing' }" @click="filterByStatus('installing')">安装中 <span class="chip-count">{{ stats.installing }}</span></span>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list" v-loading="loading">
      <!-- 看板视图 -->
      <OrderKanban
        v-if="viewMode === 'kanban'"
        :orders="orderList"
        @refresh="fetchOrders"
      />

      <!-- 卡片列表视图 -->
      <template v-else>
        <div
          v-for="row in orderList"
          :key="row.id"
          class="task-card"
          :class="{ archived: row.status === 'archived' }"
          @click="handleView(row)"
        >
          <div class="task-status" :class="row.status"></div>
          <div class="task-info">
            <div class="task-top">
              <span class="task-order-no">{{ row.order_no }}</span>
              <span class="task-status-badge" :class="getStatusBadgeClass(row.status)">
                <span class="task-status-dot"></span>
                {{ getStatusText(row.status) }}
              </span>
            </div>
            <div class="task-meta">
              <span class="task-meta-item">
                <el-icon><User /></el-icon>
                <strong>{{ row.customer?.real_name || row.customer_name || row.form_data?.company || '-' }}</strong>
                {{ row.customer?.phone ? ' · ' + row.customer.phone : '' }}
              </span>
              <span class="task-meta-item">
                <el-icon><Location /></el-icon>
                {{ row.form_data?.address || '-' }}
              </span>
            </div>
            <div class="task-bottom">
              <span v-for="item in getAdTypes(row)" :key="item" class="task-tag">{{ item }}</span>
              <span class="task-area">{{ calculateArea(row) }}㎡</span>
              <span class="task-group" v-if="row.group?.district?.province">{{ row.group.district.province.name }}-{{ row.group.district.name }}-{{ row.group.group_name || row.group.code }}</span>
              <span class="task-created">{{ formatShortDate(row.created_at) }}</span>
              <span v-if="row.status === 'designing'" class="task-created">{{ getDuration(row) }}</span>
            </div>
          </div>
          <div class="task-side">
            <div class="task-handler">{{ getHandlerLabel(row) }}：<strong>{{ row.handler?.real_name || '待分配' }}</strong></div>
            <div class="task-time">{{ getTimeText(row) }}</div>
          </div>
          <div class="task-actions" @click.stop>
            <el-button size="small" @click="handleView(row)">详情</el-button>
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && orderList.length === 0" description="暂无订单" :image-size="80" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchOrders"
        @current-change="fetchOrders"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Briefcase, Clock, EditPen, Setting, Tools, User, Location, Plus, Download } from '@element-plus/icons-vue'
import { orderApi, statisticsApi, formApi } from '@/api'
import dayjs from 'dayjs'
import { getStatusText, getStatusType } from '@/utils/constants'
import { formatShortDate } from '@/composables/useFormat'
import OrderKanban from '@/components/OrderKanban.vue'

const router = useRouter()
const loading = ref(false)
const exportLoading = ref(false)
const orderList = ref([])
const viewMode = ref('table')

const activeStatus = ref('')

const filterForm = reactive({
  keyword: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const stats = reactive({
  total: 0,
  pending: 0,
  designing: 0,
  producing: 0,
  installing: 0
})

const flowStats = reactive({
  pending: 0,
  designing: 0,
  producing: 0,
  installing: 0,
  archived: 0
})

const areaStats = reactive({ month: '0', year: '0' })

const getDuration = (row) => {
  const hours = dayjs().diff(dayjs(row.created_at), 'hour')
  if (hours >= 24) return `已耗时 ${Math.floor(hours / 24)}d`
  if (hours > 0) return `已耗时 ${hours}h`
  return '刚创建'
}

const getHandlerLabel = (row) => {
  if (row.status === 'designing' || row.status === 'design_review') return '设计师'
  if (row.status === 'producing' || row.status === 'checking') return '生产员'
  if (row.status === 'installing' || row.status === 'install_review') return '安装员'
  return '处理人'
}

const getTimeText = (row) => {
  if (row.status === 'archived') {
    const time = dayjs(row.updated_at || row.created_at).format('MM-DD')
    return `${time} 已归档`
  }
  return getDuration(row)
}

const getAdTypes = (row) => {
  const types = new Set()
  row.adItems?.forEach(item => {
    if (item.adType?.name) types.add(item.adType.name)
    else if (item.ad_type_name) types.add(item.ad_type_name)
  })
  return Array.from(types)
}

const calculateArea = (row) => {
  if (!row.adItems) return '0'
  let total = 0
  row.adItems.forEach(item => {
    item.faces?.forEach(face => {
      if (face.width && face.height) {
        total += (face.width * face.height) / 10000
      }
    })
  })
  return total.toFixed(1)
}

const getStatusBadgeClass = (status) => {
  if (['pending_review', 'measuring', 'measure_review'].includes(status)) return 'pending'
  if (['designing', 'design_review'].includes(status)) return 'designing'
  if (['producing', 'checking'].includes(status)) return 'producing'
  if (['installing', 'install_review'].includes(status)) return 'installing'
  return 'archived'
}

const allActiveStatuses = 'pending_review,measuring,measure_review,designing,design_review,producing,checking,installing,install_review'

const filterByStatus = (status) => {
  activeStatus.value = status
  handleSearch()
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const queries = [
      { key: 'total', statuses: allActiveStatuses },
      { key: 'pending', statuses: 'pending_review' },
      { key: 'designing', statuses: 'designing' },
      { key: 'producing', statuses: 'producing' },
      { key: 'installing', statuses: 'installing,install_review' }
    ]

    const results = await Promise.all(queries.map(q => {
      return orderApi.getList({ pageSize: 1, status: q.statuses }).catch(() => ({ data: { total: 0 } }))
    }))

    results.forEach((res, i) => {
      stats[queries[i].key] = res.data?.total || 0
    })
  } catch (err) {
    console.error('获取统计失败', err)
  }

  // 流程统计
  try {
    const flowQueries = [
      { key: 'pending', statuses: 'pending_review' },
      { key: 'designing', statuses: 'designing' },
      { key: 'producing', statuses: 'producing' },
      { key: 'installing', statuses: 'installing' },
      { key: 'archived', statuses: 'archived' }
    ]

    const flowResults = await Promise.all(flowQueries.map(q => {
      return orderApi.getList({ pageSize: 1, status: q.statuses }).catch(() => ({ data: { total: 0 } }))
    }))

    flowResults.forEach((res, i) => {
      flowStats[flowQueries[i].key] = res.data?.total || 0
    })
  } catch (err) {
    console.error('获取流程统计失败', err)
  }
}

// 获取面积统计
const fetchAreaStats = async () => {
  try {
    const res = await statisticsApi.getOrderStats({
      startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
      endDate: dayjs().endOf('month').format('YYYY-MM-DD')
    })
    areaStats.month = (res.data?.totalArea || 0).toFixed(2)

    const yearRes = await statisticsApi.getOrderStats({
      startDate: dayjs().startOf('year').format('YYYY-MM-DD'),
      endDate: dayjs().endOf('year').format('YYYY-MM-DD')
    })
    areaStats.year = (yearRes.data?.totalArea || 0).toFixed(2)
  } catch (err) {
    console.error('获取面积统计失败', err)
  }
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      keyword: filterForm.keyword,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (activeStatus.value) {
      const statusQueryMap = {
        'pending_review': 'pending_review',
        'designing': 'designing',
        'producing': 'producing',
        'installing': 'installing,install_review'
      }
      params.status = statusQueryMap[activeStatus.value] || activeStatus.value
    } else {
      params.status = allActiveStatuses
    }
    if (filterForm.dateRange?.length === 2) {
      params.start_date = filterForm.dateRange[0]
      params.end_date = filterForm.dateRange[1]
    }
    const res = await orderApi.getList(params)
    orderList.value = res.data?.list || []
    pagination.total = res.data?.total || 0
  } catch (err) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchOrders()
}

const handleView = (row) => router.push(`/orders/${row.id}`)
const handleEdit = (row) => router.push(`/orders/${row.id}/edit`)

// 导出订单
const handleExport = async () => {
  exportLoading.value = true
  try {
    const params = new URLSearchParams()
    if (activeStatus.value) {
      const statusQueryMap = {
        'pending_review': 'pending_review',
        'designing': 'designing',
        'producing': 'producing',
        'installing': 'installing,install_review'
      }
      params.append('status', statusQueryMap[activeStatus.value] || activeStatus.value)
    }
    if (filterForm.keyword) {
      params.append('keyword', filterForm.keyword)
    }
    if (filterForm.dateRange?.length === 2) {
      params.append('start_date', filterForm.dateRange[0])
      params.append('end_date', filterForm.dateRange[1])
    }
    window.open(`/api/v1/export/orders/excel?${params.toString()}`, '_blank')
  } catch (err) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchOrders()
  fetchStats()
  fetchAreaStats()
})
</script>

<style scoped>
.order-list-page {
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
  grid-template-columns: repeat(5, 1fr);
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
.stat-icon.pending { background: #f59e0b; }
.stat-icon.designing { background: #8b5cf6; }
.stat-icon.producing { background: #6366f1; }
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

/* ===== 流程概览 ===== */
.flow-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.flow-bar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
.flow-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.flow-dot { width: 8px; height: 8px; border-radius: 50%; }
.flow-dot.pending { background: #f59e0b; }
.flow-dot.designing { background: #8b5cf6; }
.flow-dot.producing { background: #6366f1; }
.flow-dot.installing { background: #10b981; }
.flow-dot.archived { background: #64748b; }
.flow-step-label { color: var(--text-secondary); }
.flow-step-count { font-weight: 700; color: var(--text-primary); }
.flow-arrow { color: var(--border); font-size: 16px; }

/* ===== 面积统计 ===== */
.area-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.area-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.area-stat-label { font-size: 12px; color: var(--text-secondary); }
.area-stat-value { font-size: 18px; font-weight: 800; color: var(--brand-primary); font-family: 'SF Mono', Monaco, monospace; }
.area-stat-unit { font-size: 12px; color: var(--text-secondary); }

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
  max-width: 280px;
  padding: 8px 12px 8px 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--card-bg);
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--brand-primary); }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
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
  white-space: nowrap;
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
.task-status.pending_review { background: #f59e0b; }
.task-status.measuring { background: #f59e0b; }
.task-status.measure_review { background: #f59e0b; }
.task-status.designing { background: #8b5cf6; }
.task-status.design_review { background: #8b5cf6; }
.task-status.producing { background: #6366f1; }
.task-status.checking { background: #6366f1; }
.task-status.installing { background: #10b981; }
.task-status.install_review { background: #10b981; }
.task-status.archived { background: #64748b; }

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
.task-status-badge.pending { background: var(--amber-bg); color: var(--amber); }
.task-status-badge.designing { background: var(--purple-bg); color: var(--purple); }
.task-status-badge.producing { background: var(--brand-primary-light); color: var(--brand-primary); }
.task-status-badge.installing { background: var(--green-bg); color: var(--green); }
.task-status-badge.archived { background: #f1f5f9; color: #64748b; }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.task-status-badge.pending .task-status-dot { background: var(--amber); }
.task-status-badge.designing .task-status-dot { background: var(--purple); }
.task-status-badge.producing .task-status-dot { background: var(--brand-primary); }
.task-status-badge.installing .task-status-dot { background: var(--green); }
.task-status-badge.archived .task-status-dot { background: #64748b; }

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

.task-bottom {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.task-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--bg-tertiary, #f1f5f9);
  color: var(--text-secondary);
  font-weight: 500;
}
.task-area {
  font-size: 11px;
  color: var(--brand-primary);
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}
.task-created { font-size: 11px; color: var(--text-secondary); }
.task-group { font-size: 11px; color: var(--text-secondary); }

.task-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.task-handler { font-size: 12px; color: var(--text-secondary); }
.task-handler strong { color: var(--text-primary); font-weight: 600; }
.task-time { font-size: 11px; color: var(--text-secondary); }

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

/* ===== 分页 ===== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .task-card { flex-wrap: wrap; }
  .task-side { width: 100%; flex-direction: row; justify-content: space-between; }
  .task-actions { width: 100%; justify-content: flex-end; }
  .flow-bar { flex-wrap: wrap; }
}
@media (max-width: 600px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100%; }
  .filter-chips { overflow-x: auto; }
  .task-meta { flex-direction: column; gap: 4px; }
}
</style>
