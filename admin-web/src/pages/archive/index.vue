<template>
  <div class="archive-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        归档管理
        <span>已完成订单的历史记录</span>
      </div>
      <div class="page-actions">
        <el-button @click="handleExport" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总归档数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon month">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.thisMonth }}</div>
          <div class="stat-label">本月归档</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon year">
          <el-icon><Ticket /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.thisYear }}</div>
          <div class="stat-label">本年归档</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon area">
          <el-icon><Grid /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalArea }}</div>
          <div class="stat-label">总面积(㎡)</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="filterForm.keyword"
        type="text"
        class="search-input"
        placeholder="搜索订单号/客户..."
        @keyup.enter="handleSearch"
      >
      <div class="filter-filters">
        <el-select v-model="filterForm.province_id" placeholder="省份" clearable size="small" style="width: 100px" @change="handleProvinceChange">
          <el-option v-for="p in provinces" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="filterForm.district_id" placeholder="分区" clearable size="small" style="width: 100px">
          <el-option v-for="d in districts" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-select v-model="filterForm.ad_type_id" placeholder="广告类型" clearable size="small" style="width: 120px">
          <el-option v-for="t in adTypes" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
        <el-date-picker v-model="filterForm.dateRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" size="small" style="width: 220px" value-format="YYYY-MM-DD" />
        <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
        <el-button size="small" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 归档列表 -->
    <div class="task-list" v-loading="loading">
      <template v-if="archiveList.length > 0">
        <div
          v-for="row in archiveList"
          :key="row.id"
          class="task-card"
          @click="handleDetail(row)"
        >
          <div class="task-status archived"></div>
          <div class="task-info">
            <div class="task-top">
              <span class="task-order-no">{{ row.order_no }}</span>
              <span class="task-status-badge archived">
                <span class="task-status-dot"></span>
                已归档
              </span>
            </div>
            <div class="task-meta">
              <span class="task-meta-item">
                <el-icon><User /></el-icon>
                <strong>{{ row.form_data?.company || row.title || '-' }}</strong>
                {{ row.customer?.real_name ? '· ' + row.customer.real_name : '' }}
              </span>
              <span class="task-meta-item">
                <el-icon><Location /></el-icon>
                {{ row.group?.district?.name || '-' }}
              </span>
            </div>
            <div class="task-bottom">
              <span v-for="item in row.adItems" :key="item.id" class="task-tag">{{ item.adType?.name }}</span>
              <span class="task-area">{{ calculateTotalArea(row) }}㎡</span>
              <span class="task-created">{{ formatShortDate(row.updated_at) }}</span>
              <span class="task-duration" :class="getDurationClass(row)">
                耗时 {{ getDuration(row) }}
              </span>
            </div>
          </div>
          <div class="task-actions" @click.stop>
            <el-button size="small" @click="handleDetail(row)">详情</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && archiveList.length === 0" description="暂无归档订单" :image-size="80" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchArchiveList"
        @current-change="fetchArchiveList"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { orderApi, regionApi, adTypeApi } from '@/api'
import dayjs from 'dayjs'
import { formatShortDate } from '@/composables/useFormat'
import { Folder, Calendar, Ticket, Grid, User, Location, Download, Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const exportLoading = ref(false)

const archiveList = ref([])
const provinces = ref([])
const districts = ref([])
const adTypes = ref([])

const stats = reactive({
  total: 0,
  thisMonth: 0,
  thisYear: 0,
  totalArea: '0'
})

const filterForm = reactive({
  keyword: '',
  province_id: '',
  district_id: '',
  ad_type_id: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const calculateTotalArea = (order) => {
  if (!order.adItems) return '0.00'
  let total = 0
  order.adItems.forEach(item => {
    item.faces?.forEach(face => {
      if (face.width && face.height) {
        total += (face.width * face.height) / 10000
      }
    })
  })
  return total.toFixed(2)
}

const getDuration = (order) => {
  if (!order.created_at || !order.updated_at) return '-'
  const start = dayjs(order.created_at)
  const end = dayjs(order.updated_at)
  const days = end.diff(start, 'day')
  if (days > 0) return `${days}天`
  const hours = end.diff(start, 'hour')
  return `${hours}小时`
}

const getDurationClass = (order) => {
  if (!order.created_at || !order.updated_at) return ''
  const days = dayjs(order.updated_at).diff(dayjs(order.created_at), 'day')
  if (days > 30) return 'slow'
  if (days > 14) return 'normal'
  return 'fast'
}

const fetchArchiveList = async () => {
  loading.value = true
  try {
    const params = {
      status: 'archived',
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterForm.keyword) params.keyword = filterForm.keyword
    if (filterForm.district_id) params.district_id = filterForm.district_id
    if (filterForm.ad_type_id) params.ad_type_id = filterForm.ad_type_id
    if (filterForm.dateRange?.length === 2) {
      params.start_date = filterForm.dateRange[0]
      params.end_date = filterForm.dateRange[1]
    }

    const res = await orderApi.getList(params)
    archiveList.value = res.data?.list || []
    pagination.total = res.data?.total || 0

    stats.total = pagination.total
  } catch (err) {
    ElMessage.error('获取归档列表失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const now = dayjs()
    const monthStart = now.startOf('month').format('YYYY-MM-DD')
    const yearStart = now.startOf('year').format('YYYY-MM-DD')

    const [monthRes, yearRes] = await Promise.all([
      orderApi.getList({ status: 'archived', start_date: monthStart, pageSize: 1 }),
      orderApi.getList({ status: 'archived', start_date: yearStart, pageSize: 1 })
    ])

    stats.thisMonth = monthRes.data?.total || 0
    stats.thisYear = yearRes.data?.total || 0
  } catch (err) {
    console.error(err)
  }
}

const fetchProvinces = async () => {
  try {
    const res = await regionApi.getProvinces()
    provinces.value = res.data || []
  } catch (err) {
    console.error(err)
  }
}

const handleProvinceChange = async (provinceId) => {
  filterForm.district_id = ''
  if (!provinceId) {
    districts.value = []
    return
  }
  try {
    const res = await regionApi.getDistricts(provinceId)
    districts.value = res.data || []
  } catch (err) {
    console.error(err)
  }
}

const fetchAdTypes = async () => {
  try {
    const res = await adTypeApi.getList()
    adTypes.value = res.data?.list || []
  } catch (err) {
    console.error(err)
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchArchiveList()
}

const handleReset = () => {
  filterForm.keyword = ''
  filterForm.province_id = ''
  filterForm.district_id = ''
  filterForm.ad_type_id = ''
  filterForm.dateRange = []
  districts.value = []
  handleSearch()
}

const handleRefresh = () => {
  fetchArchiveList()
  fetchStats()
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const params = new URLSearchParams()
    params.append('status', 'archived')
    if (filterForm.keyword) params.append('keyword', filterForm.keyword)
    if (filterForm.district_id) params.append('district_id', filterForm.district_id)
    if (filterForm.ad_type_id) params.append('ad_type_id', filterForm.ad_type_id)
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

const handleDetail = (row) => {
  router.push(`/archive/${row.id}`)
}

onMounted(() => {
  fetchArchiveList()
  fetchStats()
  fetchProvinces()
  fetchAdTypes()
})
</script>

<style scoped>
.archive-page {
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
  transition: all 0.2s;
}
.stat-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  transform: translateY(-1px);
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
.stat-icon.total { background: #64748b; }
.stat-icon.month { background: #8b5cf6; }
.stat-icon.year { background: #6366f1; }
.stat-icon.area { background: #10b981; }
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
.filter-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

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
.task-status {
  width: 4px;
  height: 100%;
  min-height: 56px;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
}
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
.task-status-badge.archived { background: #f1f5f9; color: #64748b; }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
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
.task-duration {
  font-size: 11px;
  font-weight: 600;
}
.task-duration.fast { color: #10b981; }
.task-duration.normal { color: #f59e0b; }
.task-duration.slow { color: #ef4444; }

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== 分页 ===== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .task-card { flex-wrap: wrap; }
  .task-actions { width: 100%; justify-content: flex-end; }
}
@media (max-width: 600px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100%; }
  .filter-filters { flex-wrap: wrap; }
  .task-meta { flex-direction: column; gap: 4px; }
}
</style>
