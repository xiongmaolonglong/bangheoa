<template>
  <div class="review-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        审核管理
        <span>待审核订单与任务处理</span>
      </div>
      <div class="page-actions">
        <el-button @click="handleExportReview" :loading="exportLoading">
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
      <div class="stat-card" :class="{ active: activeStatus === 'all' }" @click="filterByStatus('all')">
        <div class="stat-icon total">
          <el-icon><Briefcase /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部待审</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'pending_review' }" @click="filterByStatus('pending_review')">
        <div class="stat-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">申请审核</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'design_review' }" @click="filterByStatus('design_review')">
        <div class="stat-icon design">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.design }}</div>
          <div class="stat-label">设计审核</div>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeStatus === 'install_review' }" @click="filterByStatus('install_review')">
        <div class="stat-icon install">
          <el-icon><Tools /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.install }}</div>
          <div class="stat-label">安装审核</div>
        </div>
      </div>
    </div>

    <!-- 审核效率 -->
    <div class="efficiency-row">
      <div class="efficiency-card">
        <div class="efficiency-icon today">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="efficiency-info">
          <div class="efficiency-value">{{ efficiency.todayReviewed }}</div>
          <div class="efficiency-label">今日已审</div>
        </div>
      </div>
      <div class="efficiency-card">
        <div class="efficiency-icon rate">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="efficiency-info">
          <div class="efficiency-value">{{ efficiency.approveRate }}%</div>
          <div class="efficiency-label">通过率</div>
        </div>
      </div>
      <div class="efficiency-card">
        <div class="efficiency-icon avg">
          <el-icon><Timer /></el-icon>
        </div>
        <div class="efficiency-info">
          <div class="efficiency-value">{{ efficiency.avgTime }}</div>
          <div class="efficiency-label">平均耗时</div>
        </div>
      </div>
      <div class="efficiency-card">
        <div class="efficiency-icon pending-time">
          <el-icon><AlarmClock /></el-icon>
        </div>
        <div class="efficiency-info">
          <div class="efficiency-value">{{ efficiency.oldestWait }}</div>
          <div class="efficiency-label">最久等待</div>
        </div>
      </div>
    </div>

    <!-- 超时预警 -->
    <div class="alert-bar" v-if="urgentCount > 0">
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          <span class="alert-title">有 <strong>{{ urgentCount }}</strong> 个订单等待超过24小时，请及时处理</span>
        </template>
        <template #default>
          <div class="alert-actions">
            <el-button size="small" type="warning" plain @click="filterByUrgency('urgent')">查看超时订单</el-button>
            <el-button size="small" type="success" @click="handleBatchApproveUrgent">一键通过超时订单</el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 审核流程 -->
    <div class="flow-bar">
      <span class="flow-bar-label">审核</span>
      <span class="flow-step"><span class="flow-dot pending"></span><span class="flow-step-label">申请审核</span><span class="flow-step-count">{{ stats.pending }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot design"></span><span class="flow-step-label">设计审核</span><span class="flow-step-count">{{ stats.design }}</span></span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><span class="flow-dot install"></span><span class="flow-step-label">安装审核</span><span class="flow-step-count">{{ stats.install }}</span></span>
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
      <div class="filter-chips">
        <span class="chip" :class="{ active: activeStatus === 'all' && !filterForm.urgency }" @click="clearFilters">全部 <span class="chip-count">{{ stats.total }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'pending_review' }" @click="filterByStatus('pending_review')">申请审核 <span class="chip-count">{{ stats.pending }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'design_review' }" @click="filterByStatus('design_review')">设计审核 <span class="chip-count">{{ stats.design }}</span></span>
        <span class="chip" :class="{ active: activeStatus === 'install_review' }" @click="filterByStatus('install_review')">安装审核 <span class="chip-count">{{ stats.install }}</span></span>
        <span class="chip" :class="{ active: filterForm.urgency === 'urgent' }" @click="filterByUrgency('urgent')">超时 <span class="chip-count">{{ urgentCount }}</span></span>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div class="batch-bar" v-if="selectedRows.length > 0">
      <span class="batch-info">已选择 <strong>{{ selectedRows.length }}</strong> 条</span>
      <el-button size="small" type="success" @click="handleBatchApprove" :loading="batchLoading">
        批量通过
      </el-button>
      <el-button size="small" type="danger" plain @click="handleBatchReject" :loading="batchLoading">
        批量驳回
      </el-button>
      <el-button size="small" @click="selectedRows = []">取消选择</el-button>
    </div>

    <!-- 审核列表 -->
    <div class="task-list" v-loading="loading">
      <template v-if="taskList.length > 0">
        <div
          v-for="row in taskList"
          :key="row.id"
          class="task-card"
          :class="{ urgent: getUrgencyLevel(row) === 'urgent', selected: selectedRows.includes(row) }"
          @click="goDetail(row)"
        >
          <div class="task-status" :class="row.status"></div>
          <div class="task-info">
            <div class="task-top">
              <span class="task-order-no">{{ row.order_no }}</span>
              <span class="task-status-badge" :class="getStageBadgeClass(row.status)">
                <span class="task-status-dot"></span>
                {{ getReviewStage(row.status).text }}
              </span>
              <span v-if="getUrgencyLevel(row) === 'urgent'" class="urgent-badge">超时</span>
              <span v-else-if="getUrgencyLevel(row) === 'warning'" class="warning-badge">即将超时</span>
              <span v-if="row.status === 'pending_review' && riskMap[row.id]" class="risk-badge" :class="getRiskClass(row.id)">
                <el-icon><Warning /></el-icon>
                {{ getRiskLabel(row.id) }}
              </span>
            </div>
            <div class="task-meta">
              <span class="task-meta-item">
                <el-icon><User /></el-icon>
                <strong>{{ row.form_data?.company || row.title || '-' }}</strong>
              </span>
              <span class="task-meta-item">
                <el-icon><Document /></el-icon>
                {{ getReviewContent(row) }}
              </span>
            </div>
            <div class="task-bottom">
              <span class="task-wait-time" :class="getUrgencyLevel(row)">
                <el-icon><Clock /></el-icon>
                等待 {{ getWaitTime(row) }}
              </span>
              <span class="task-handler-text">处理人：{{ row.handler?.real_name || '未指派' }}</span>
            </div>
          </div>
          <div class="task-actions" @click.stop>
            <el-button type="success" size="small" @click="handleQuickApprove(row)">通过</el-button>
            <el-button type="danger" size="small" plain @click="handleQuickReject(row)">驳回</el-button>
            <el-button size="small" @click="goDetail(row)">详情</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && taskList.length === 0" description="暂无待审核订单" :image-size="80" />
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

    <!-- 驳回弹窗 -->
    <el-dialog v-model="quickRejectVisible" :title="batchReject ? '批量驳回' : '驳回原因'" width="420px">
      <p v-if="batchReject" style="margin-bottom: 12px; color: var(--text-secondary);">已选择 {{ selectedRows.length }} 条记录</p>
      <el-form :model="quickRejectForm" label-width="0">
        <el-form-item>
          <el-input
            v-model="quickRejectForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请说明驳回原因..."
            autofocus
          />
        </el-form-item>
        <div class="quick-remarks">
          <span class="quick-remark-chip" @click="quickRejectForm.remark = '资料不全'">资料不全</span>
          <span class="quick-remark-chip" @click="quickRejectForm.remark = '尺寸有误'">尺寸有误</span>
          <span class="quick-remark-chip" @click="quickRejectForm.remark = '不符合要求'">不符合要求</span>
          <span class="quick-remark-chip" @click="quickRejectForm.remark = '需重新测量'">需重新测量</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="quickRejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="quickLoading" @click="submitQuickReject">确定驳回</el-button>
      </template>
    </el-dialog>

    <!-- 审核通过弹窗（可选备注） -->
    <el-dialog v-model="quickApproveVisible" title="审核通过" width="420px">
      <p style="margin-bottom: 12px; color: var(--text-secondary);">确认通过订单 <strong>{{ currentOrder?.order_no }}</strong>？</p>
      <el-form :model="quickApproveForm" label-width="0">
        <el-form-item>
          <el-input
            v-model="quickApproveForm.remark"
            type="textarea"
            :rows="2"
            placeholder="审核备注（可选）"
          />
        </el-form-item>
        <div class="quick-remarks">
          <span class="quick-remark-chip" @click="quickApproveForm.remark = '符合要求'">符合要求</span>
          <span class="quick-remark-chip" @click="quickApproveForm.remark = '同意推进'">同意推进</span>
          <span class="quick-remark-chip" @click="quickApproveForm.remark = '已通过，请继续'">已通过，请继续</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="quickApproveVisible = false">取消</el-button>
        <el-button type="success" :loading="quickLoading" @click="submitQuickApprove">确定通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reviewApi } from '@/api'
import { useUserStore } from '@/store/user'
import dayjs from 'dayjs'
import { Briefcase, Clock, EditPen, Tools, User, Document, Refresh, Download, Calendar, TrendCharts, Timer, AlarmClock, Warning, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const quickLoading = ref(false)
const batchLoading = ref(false)
const exportLoading = ref(false)
const quickRejectVisible = ref(false)
const quickApproveVisible = ref(false)
const batchReject = ref(false)
const currentOrder = ref(null)

const taskList = ref([])
const selectedRows = ref([])
const activeStatus = ref('all')
const riskMap = reactive({}) // orderId -> risk assessment
const autoReviewEnabled = ref(false)

const filterForm = reactive({
  keyword: '',
  urgency: ''
})

const quickRejectForm = reactive({ remark: '' })
const quickApproveForm = reactive({ remark: '' })

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const reviewStageMap = {
  pending_review: { text: '申请审核', type: 'warning' },
  design_review: { text: '设计审核', type: 'design' },
  install_review: { text: '安装审核', type: 'success' }
}

const getReviewStage = (status) => reviewStageMap[status] || { text: status, type: 'info' }

const stats = reactive({
  total: 0,
  pending: 0,
  design: 0,
  install: 0
})

const efficiency = reactive({
  todayReviewed: 0,
  approveRate: 0,
  avgTime: '-',
  oldestWait: '-'
})

const urgentCount = computed(() => taskList.value.filter(t => getUrgencyLevel(t) === 'urgent').length)

const filterByStatus = (status) => {
  activeStatus.value = status
  filterForm.urgency = ''
  handleSearch()
}

const filterByUrgency = (urgency) => {
  filterForm.urgency = urgency
  activeStatus.value = 'all'
  handleSearch()
}

const clearFilters = () => {
  activeStatus.value = 'all'
  filterForm.urgency = ''
  filterForm.keyword = ''
  handleSearch()
}

const getStageBadgeClass = (status) => {
  if (status === 'pending_review') return 'pending'
  if (status === 'design_review') return 'designing'
  if (status === 'install_review') return 'installing'
  return 'archived'
}

const goDetail = (row) => router.push(`/review/${row.id}`)

const getReviewContent = (row) => {
  const map = {
    pending_review: '待派单设计',
    design_review: '设计方案',
    install_review: '安装报告'
  }
  return map[row.status] || '-'
}

const getWaitTime = (row) => {
  const created = dayjs(row.created_at)
  const now = dayjs()
  const hours = now.diff(created, 'hour')
  const days = now.diff(created, 'day')

  if (days > 0) return `${days}天`
  if (hours > 0) return `${hours}时`
  return '刚刚'
}

const getUrgencyLevel = (row) => {
  const hours = dayjs().diff(dayjs(row.created_at), 'hour')
  if (hours >= 24) return 'urgent'
  if (hours >= 8) return 'warning'
  return 'normal'
}

const fetchStats = async () => {
  try {
    const res = await reviewApi.getPendingList({ page: 1, pageSize: 1 })
    const all = res.data?.list || []

    stats.pending = all.filter(t => t.status === 'pending_review').length
    stats.design = all.filter(t => t.status === 'design_review').length
    stats.install = all.filter(t => t.status === 'install_review').length
    stats.total = stats.pending + stats.design + stats.install
  } catch (err) {
    console.error('获取统计失败', err)
  }
}

const fetchEfficiency = async () => {
  try {
    // 今日已审 - 通过今天的审核日志估算
    const today = dayjs().format('YYYY-MM-DD')
    // 最久等待
    if (taskList.value.length > 0) {
      const oldest = taskList.value.reduce((min, row) =>
        dayjs(row.created_at).isBefore(dayjs(min.created_at)) ? row : min
      )
      efficiency.oldestWait = getWaitTime(oldest)
    }
  } catch (err) {
    console.error('获取效率数据失败', err)
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (activeStatus.value && activeStatus.value !== 'all') {
      params.type = activeStatus.value
    }
    if (filterForm.keyword) {
      params.keyword = filterForm.keyword
    }
    const res = await reviewApi.getPendingList(params)
    let list = res.data?.list || []

    // 紧急筛选
    if (filterForm.urgency === 'urgent') {
      list = list.filter(row => getUrgencyLevel(row) === 'urgent')
    }

    taskList.value = list
    pagination.total = res.data?.total || 0
    fetchEfficiency()
    // 获取 pending_review 订单的风险评估
    if (!activeStatus.value || activeStatus.value === 'all' || activeStatus.value === 'pending_review') {
      setTimeout(() => fetchRisksForPendingOrders(), 100)
    }
  } catch (err) {
    console.error('获取审核列表错误:', err)
    ElMessage.error('获取待审核列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchTasks()
}

const handleRefresh = () => {
  fetchTasks()
  fetchStats()
  fetchAutoReviewConfig()
}

const handleQuickApprove = (row) => {
  currentOrder.value = row
  quickApproveForm.remark = ''
  quickApproveVisible.value = true
}

const submitQuickApprove = async () => {
  quickLoading.value = true
  try {
    await reviewApi.approve(currentOrder.value.id, { remark: quickApproveForm.remark })
    ElMessage.success('审核通过')
    quickApproveVisible.value = false
    fetchTasks()
    fetchStats()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    quickLoading.value = false
  }
}

const handleQuickReject = (row) => {
  currentOrder.value = row
  batchReject.value = false
  quickRejectForm.remark = ''
  quickRejectVisible.value = true
}

const submitQuickReject = async () => {
  if (!quickRejectForm.remark) {
    return ElMessage.warning('请填写驳回原因')
  }

  quickLoading.value = true
  try {
    if (batchReject.value) {
      // 批量驳回
      let successCount = 0
      for (const row of selectedRows.value) {
        try {
          await reviewApi.reject(row.id, { remark: quickRejectForm.remark })
          successCount++
        } catch (err) {
          console.error(`驳回 ${row.order_no} 失败`, err)
        }
      }
      ElMessage.success(`成功驳回 ${successCount} 条`)
      selectedRows.value = []
    } else {
      await reviewApi.reject(currentOrder.value.id, { remark: quickRejectForm.remark })
      ElMessage.success('已驳回')
    }
    quickRejectVisible.value = false
    fetchTasks()
    fetchStats()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    quickLoading.value = false
  }
}

// 批量操作
const handleBatchApprove = async () => {
  try {
    await ElMessageBox.confirm(`确认批量通过 ${selectedRows.value.length} 条订单？`, '批量通过', { type: 'success' })
    batchLoading.value = true
    let successCount = 0
    for (const row of selectedRows.value) {
      try {
        await reviewApi.approve(row.id, {})
        successCount++
      } catch (err) {
        console.error(`通过 ${row.order_no} 失败`, err)
      }
    }
    batchLoading.value = false
    ElMessage.success(`成功通过 ${successCount} 条`)
    selectedRows.value = []
    fetchTasks()
    fetchStats()
  } catch (err) {
    if (err !== 'cancel') batchLoading.value = false
  }
}

const handleBatchReject = () => {
  batchReject.value = true
  quickRejectForm.remark = ''
  quickRejectVisible.value = true
}

const handleBatchApproveUrgent = async () => {
  const urgentRows = taskList.value.filter(t => getUrgencyLevel(t) === 'urgent')
  if (urgentRows.length === 0) return ElMessage.info('暂无超时订单')

  try {
    await ElMessageBox.confirm(`确认通过 ${urgentRows.length} 个超时订单？`, '批量通过超时', { type: 'warning' })
    batchLoading.value = true
    let successCount = 0
    for (const row of urgentRows) {
      try {
        await reviewApi.approve(row.id, { remark: '超时自动通过' })
        successCount++
      } catch (err) {
        console.error(`通过 ${row.order_no} 失败`, err)
      }
    }
    batchLoading.value = false
    ElMessage.success(`成功通过 ${successCount} 个超时订单`)
    fetchTasks()
    fetchStats()
  } catch (err) {
    if (err !== 'cancel') batchLoading.value = false
  }
}

// 导出
const handleExportReview = async () => {
  exportLoading.value = true
  try {
    const params = new URLSearchParams()
    params.append('status', 'pending_review,design_review,install_review')
    if (filterForm.keyword) params.append('keyword', filterForm.keyword)
    window.open(`/api/v1/export/orders/excel?${params.toString()}`, '_blank')
  } catch (err) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 获取订单风险评估
const fetchOrderRisk = async (orderId) => {
  try {
    const res = await reviewApi.getOrderRisk(orderId)
    riskMap[orderId] = res.data
  } catch (err) {
    // 静默失败
  }
}

// 获取自动审核配置
const fetchAutoReviewConfig = async () => {
  try {
    const res = await reviewApi.getAutoReviewConfig()
    autoReviewEnabled.value = res.data?.pre_review_enabled || false
  } catch (err) {
    console.error('获取自动审核配置失败', err)
  }
}

// 手动触发预审核
const handleTriggerPreReview = async () => {
  try {
    const res = await reviewApi.triggerPreReview()
    const { autoApproved, flagged } = res.data || {}
    ElMessage.success(`预审核完成：自动通过 ${autoApproved} 单，标记高风险 ${flagged} 单`)
    fetchTasks()
    fetchStats()
  } catch (err) {
    ElMessage.error('触发预审核失败')
  }
}

// 风险等级样式
const getRiskClass = (orderId) => {
  const risk = riskMap[orderId]
  if (!risk) return ''
  if (risk.level === 'high') return 'risk-high'
  if (risk.level === 'medium') return 'risk-medium'
  return 'risk-low'
}

// 风险标签文本
const getRiskLabel = (orderId) => {
  const risk = riskMap[orderId]
  if (!risk) return ''
  return `${risk.score}分`
}

onMounted(() => {
  fetchTasks()
  fetchStats()
  fetchAutoReviewConfig()
})

// 列表加载完成后获取风险评估（仅 pending_review 订单）
const fetchRisksForPendingOrders = async () => {
  const pendingOrders = taskList.value.filter(t => t.status === 'pending_review')
  for (const order of pendingOrders) {
    if (!riskMap[order.id]) {
      await fetchOrderRisk(order.id)
    }
  }
}
</script>

<style scoped>
.review-page {
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
.stat-icon.pending { background: #f59e0b; }
.stat-icon.design { background: #8b5cf6; }
.stat-icon.install { background: #10b981; }
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

/* ===== 审核效率 ===== */
.efficiency-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.efficiency-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}
.efficiency-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.efficiency-icon.today { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
.efficiency-icon.rate { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.efficiency-icon.avg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.efficiency-icon.pending-time { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.efficiency-info { flex: 1; }
.efficiency-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.efficiency-label {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ===== 超时预警 ===== */
.alert-bar :deep(.el-alert) {
  border-radius: var(--radius-lg);
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.alert-title { font-size: 13px; }
.alert-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* ===== 审核流程 ===== */
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
.flow-dot.design { background: #8b5cf6; }
.flow-dot.install { background: #10b981; }
.flow-step-label { color: var(--text-secondary); }
.flow-step-count { font-weight: 700; color: var(--text-primary); }
.flow-arrow { color: var(--border); font-size: 16px; }

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

/* ===== 批量操作栏 ===== */
.batch-bar {
  background: var(--brand-primary);
  border-radius: var(--radius-lg);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  animation: slideDown 0.2s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.batch-info { font-size: 13px; }
.batch-info strong { font-size: 16px; }
.batch-bar .el-button { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.3); color: #fff; }
.batch-bar .el-button:hover { background: rgba(255,255,255,0.3); }
.batch-bar .el-button:last-child { border-color: rgba(255,255,255,0.5); }

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
.task-card.urgent {
  border-left: 3px solid #ef4444;
  background: rgba(239, 68, 68, 0.02);
}
.task-card.selected {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px var(--brand-primary-light);
}
.task-status {
  width: 4px;
  height: 100%;
  min-height: 56px;
  border-radius: 2px;
  flex-shrink: 0;
  align-self: stretch;
}
.task-status.pending_review { background: #f59e0b; }
.task-status.design_review { background: #8b5cf6; }
.task-status.install_review { background: #10b981; }

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
.task-status-badge.installing { background: var(--green-bg); color: var(--green); }
.task-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.task-status-badge.pending .task-status-dot { background: var(--amber); }
.task-status-badge.designing .task-status-dot { background: var(--purple); }
.task-status-badge.installing .task-status-dot { background: var(--green); }

.urgent-badge {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  animation: pulse 2s infinite;
}
.warning-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
}
.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
}
.risk-badge.risk-low {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.risk-badge.risk-medium {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.risk-badge.risk-high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  animation: pulse 2s infinite;
}
.risk-badge .el-icon { font-size: 12px; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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

.task-bottom {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.task-wait-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}
.task-wait-time.urgent { color: #ef4444; }
.task-wait-time.warning { color: #f59e0b; }
.task-wait-time.normal { color: var(--text-secondary); }
.task-handler-text { font-size: 12px; color: var(--text-secondary); }

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== 快捷备注 ===== */
.quick-remarks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.quick-remark-chip {
  padding: 4px 10px;
  border-radius: 99px;
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.quick-remark-chip:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: var(--brand-primary-light);
}

/* ===== 分页 ===== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row, .efficiency-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .stats-row, .efficiency-row { grid-template-columns: repeat(2, 1fr); }
  .task-card { flex-wrap: wrap; }
  .task-actions { width: 100%; justify-content: flex-end; }
  .flow-bar { flex-wrap: wrap; }
}
@media (max-width: 600px) {
  .stats-row, .efficiency-row { grid-template-columns: 1fr 1fr; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100%; }
  .filter-chips { overflow-x: auto; }
  .task-meta { flex-direction: column; gap: 4px; }
}
</style>
