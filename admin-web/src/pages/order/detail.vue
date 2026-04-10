<template>
  <div class="order-detail" v-loading="loading">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <button class="back-btn" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div>
          <div class="order-header">
            <span class="order-no">{{ order.order_no }}</span>
            <span class="status-badge" :class="getStatusBadgeClass(order.status)">
              <span class="dot"></span>
              {{ getStatusText(order.status) }}
            </span>
          </div>
          <div class="breadcrumb">
            <template v-if="order.group?.district?.province">{{ order.group.district.province.name }}</template>
            <template v-if="order.group?.district"> · {{ order.group.district.name }}</template>
            <template v-if="order.group"> · {{ order.group.name }}</template>
            <span> · {{ getYearMonth(order.created_at) }}</span>
          </div>
        </div>
      </div>
      <div class="top-bar-actions">
        <el-button type="success" size="small" v-if="isReviewStatus" @click="handleApprove">审核通过</el-button>
        <el-button type="danger" size="small" v-if="isReviewStatus" @click="handleReject">驳回</el-button>
        <el-button size="small" v-if="canEditOrder" @click="handleEdit">编辑</el-button>
      </div>
    </div>

    <!-- 主布局 -->
    <div class="main-layout">
      <!-- 左侧信息面板 -->
      <div class="info-panel">
        <!-- 订单信息 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><Document /></el-icon>
            订单信息
          </div>
          <div class="info-card-body">
            <div class="info-row">
              <span class="info-label">订单号</span>
              <span class="info-value order-no-text">{{ order.order_no }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">状态</span>
              <span class="info-value">{{ getStatusText(order.status) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">处理人</span>
              <span class="info-value">{{ order.handler?.real_name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(order.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 客户信息 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><User /></el-icon>
            客户信息
          </div>
          <div class="info-card-body">
            <div class="customer-name">{{ order.form_data?.company || order.title || '-' }}</div>
            <div class="contact-item" v-if="order.customer_phone">
              <div class="contact-icon">
                <el-icon><Phone /></el-icon>
              </div>
              <div class="contact-text">
                <span>{{ order.customer_phone }}</span>
                <span class="contact-label">联系电话</span>
              </div>
            </div>
            <div class="contact-item" v-if="order.customer?.real_name">
              <div class="contact-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="contact-text">
                <span>{{ order.customer.real_name }}</span>
                <span class="contact-label">联系人</span>
              </div>
            </div>
            <div class="contact-item" v-if="order.address">
              <div class="contact-icon">
                <el-icon><Location /></el-icon>
              </div>
              <div class="contact-text">
                <span>{{ order.address }}</span>
                <span class="contact-label">安装地址</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 需求说明 -->
        <div class="info-card" v-if="order.requirement">
          <div class="info-card-header">
            <el-icon><Memo /></el-icon>
            需求说明
          </div>
          <div class="info-card-body">
            <div class="requirement-text">{{ order.requirement }}</div>
          </div>
        </div>

        <!-- 流程进度 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><TrendCharts /></el-icon>
            流程进度
          </div>
          <div class="info-card-body">
            <div class="progress-stages">
              <div
                v-for="stage in stages"
                :key="stage.key"
                class="progress-stage"
              >
                <div class="stage-dot" :class="getStageClass(stage.key)">
                  <el-icon v-if="getStageClass(stage.key) === 'done'"><Select /></el-icon>
                </div>
                <span class="stage-name" :class="{ active: isStageActive(stage.key) }">{{ stage.name }}</span>
                <span class="stage-handler">{{ getStageHandler(stage.key) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧设计区 -->
      <div class="design-area">
        <!-- 广告项目 -->
        <template v-if="order.adItems && order.adItems.length > 0">
          <div v-for="item in order.adItems" :key="item.id" class="type-group">
            <div class="type-group-header" @click="item.collapsed = !item.collapsed">
              <el-icon class="chevron" :class="{ open: !item.collapsed }"><ArrowRight /></el-icon>
              <span class="type-name">{{ item.adType?.name || '-' }}</span>
              <span class="type-count">{{ item.faces?.length || 0 }} 个测量面</span>
              <span class="type-remark" v-if="item.remark">{{ item.remark }}</span>
            </div>
            <div class="type-group-body" v-show="!item.collapsed">
              <div class="face-grid">
                <div v-for="face in item.faces" :key="face.id" class="face-card">
                  <div class="face-card-header">
                    <span class="face-name">{{ face.face_name }}</span>
                    <span class="face-size">{{ face.width }}×{{ face.height }}cm</span>
                  </div>
                  <div class="face-card-body">
                    <div class="face-meta">
                      <span class="meta-item">面积: <strong>{{ ((face.width * face.height) / 10000).toFixed(2) }} ㎡</strong></span>
                      <span class="meta-item">材质: <strong>{{ face.material?.name || '-' }}</strong></span>
                    </div>

                    <!-- Photo Compare -->
                    <div class="photo-compare">
                      <!-- Measurement Photo -->
                      <div class="photo-slot" v-if="parsePhotos(face.photos).length">
                        <span class="photo-slot-label measure">测量图</span>
                        <el-image
                          v-for="(photo, idx) in parsePhotos(face.photos)"
                          :key="idx"
                          :src="getPhotoUrl(photo)"
                          :preview-src-list="parsePhotos(face.photos).map(getPhotoUrl)"
                          fit="cover"
                          class="photo-image"
                          :initial-index="idx"
                          lazy
                        />
                      </div>
                      <div class="photo-slot" v-else>
                        <span class="photo-slot-label measure">测量图</span>
                        <div class="photo-upload-placeholder">
                          <el-icon><Picture /></el-icon>
                          无测量图
                        </div>
                      </div>

                      <!-- Design Photo -->
                      <div class="photo-slot" v-if="getFaceDesignDrawings(face.id).length">
                        <span class="photo-slot-label design">设计图</span>
                        <el-image
                          v-for="(drawing, idx) in getFaceDesignDrawings(face.id)"
                          :key="idx"
                          :src="getPhotoUrl(drawing.file_url)"
                          :preview-src-list="getFaceDesignDrawings(face.id).map(d => getPhotoUrl(d.file_url))"
                          fit="cover"
                          class="photo-image"
                          :initial-index="idx"
                          lazy
                        />
                      </div>
                      <div class="photo-slot" v-else>
                        <span class="photo-slot-label design">设计图</span>
                        <div class="photo-upload-placeholder">
                          <el-icon><Picture /></el-icon>
                          待上传
                        </div>
                      </div>
                    </div>

                    <div class="face-remark" v-if="face.remark">{{ face.remark }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 操作日志 -->
        <div class="log-card">
          <div class="log-header" @click="logExpanded = !logExpanded">
            <span class="log-title">操作日志</span>
            <span class="log-count">{{ logs.length }} 条</span>
            <el-icon class="collapse-icon" :class="{ open: logExpanded }"><ArrowRight /></el-icon>
          </div>
          <div class="log-body" v-show="logExpanded">
            <div class="log-timeline">
              <div v-for="(log, i) in logs" :key="log.id" class="log-entry">
                <div class="log-dot-col">
                  <div class="log-dot" :class="{ latest: i === 0 }"></div>
                </div>
                <div class="log-content">
                  <div class="log-main">
                    <span class="log-operator">{{ log.operator?.real_name || '系统' }}</span>
                    <span class="log-action">{{ getActionText(log.action) }}</span>
                    <span class="log-remark" v-if="log.remark">· {{ log.remark }}</span>
                  </div>
                  <span class="log-time">{{ formatDate(log.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 审核通过弹窗 -->
    <el-dialog v-model="approveDialogVisible" title="审核通过" width="420px">
      <el-form :model="approveForm" label-width="80px">
        <el-form-item label="派单" v-if="order.status === 'pending_review'">
          <el-select v-model="approveForm.handler_id" placeholder="选择处理人" style="width: 100%">
            <el-option v-for="u in handlers" :key="u.id" :label="u.real_name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitApprove">确定</el-button>
      </template>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回" width="420px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="原因" required>
          <el-input v-model="rejectForm.remark" type="textarea" :rows="3" placeholder="请说明驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitLoading" @click="submitReject">确定驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Document, User, Phone, Location, Memo, TrendCharts, Select, Picture } from '@element-plus/icons-vue'
import { orderApi, reviewApi, formApi } from '@/api'
import { useUserStore } from '@/store/user'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)
const approveDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const logExpanded = ref(true)

const order = ref({})
const logs = ref([])
const handlers = ref([])
const formFieldsMap = ref({})

const approveForm = reactive({
  handler_id: null,
  remark: ''
})

const rejectForm = reactive({
  remark: ''
})

const stages = [
  { key: 'pending_review', name: '测量申请' },
  { key: 'measuring', name: '测量作业' },
  { key: 'measure_review', name: '测量审核' },
  { key: 'designing', name: '方案设计' },
  { key: 'design_review', name: '设计审核' },
  { key: 'producing', name: '生产制作' },
  { key: 'checking', name: '物料核对' },
  { key: 'installing', name: '现场安装' },
  { key: 'install_review', name: '安装审核' },
  { key: 'archived', name: '归档' }
]

const statusMap = {
  pending_review: { text: '待审核', type: 'warning' },
  designing: { text: '设计中', type: 'primary' },
  design_review: { text: '待审设计', type: 'warning' },
  producing: { text: '生产中', type: 'info' },
  checking: { text: '核对中', type: 'info' },
  installing: { text: '安装中', type: 'success' },
  install_review: { text: '待审安装', type: 'warning' },
  archived: { text: '已归档', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
}

const actionMap = {
  create: '创建订单',
  update: '更新订单',
  advance: '推进状态',
  approve: '审核通过',
  reject: '驳回订单',
  dispatch: '派单'
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusType = (status) => statusMap[status]?.type || ''
const getActionText = (action) => actionMap[action] || action
const formatDate = (date) => date ? dayjs(date).format('MM-DD HH:mm') : '-'
const getYearMonth = (date) => date ? dayjs(date).format('YYYY年MM月') : '-'

const getStatusBadgeClass = (status) => {
  if (['pending_review', 'design_review', 'install_review'].includes(status)) return 'review'
  if (['archived'].includes(status)) return 'archived'
  if (['rejected'].includes(status)) return 'rejected'
  if (['designing', 'measuring', 'measure_review'].includes(status)) return 'designing'
  if (['producing', 'checking', 'installing'].includes(status)) return 'done'
  return 'designing'
}

// Stage progress helpers
const STAGE_ORDER = stages.map(s => s.key)

const isStagePassed = (stageKey) => {
  const currentIdx = STAGE_ORDER.indexOf(order.value.status)
  const stageIdx = STAGE_ORDER.indexOf(stageKey)
  return stageIdx < currentIdx
}

const isStageActive = (stageKey) => {
  return order.value.status === stageKey
}

const getStageClass = (stageKey) => {
  if (isStageActive(stageKey)) return 'current'
  if (isStagePassed(stageKey)) return 'done'
  return 'pending'
}

const getStageHandler = (stageKey) => {
  // Try to find handler from logs
  const stageLog = logs.value.find(log => {
    if (stageKey === 'pending_review') return log.action === 'dispatch' || log.action === 'create'
    if (stageKey === 'measuring') return log.action === 'dispatch'
    if (stageKey === 'measure_review') return log.action === 'advance'
    if (stageKey === 'designing') return log.action === 'approve' || log.action === 'dispatch'
    return false
  })
  if (stageLog?.operator?.real_name) return stageLog.operator.real_name
  // For current stage, show order handler
  if (isStageActive(stageKey) && order.value.handler?.real_name) return order.value.handler.real_name
  return '-'
}

const parsePhotos = (photos) => {
  if (!photos) return []
  if (Array.isArray(photos)) return photos
  try { return JSON.parse(photos) } catch { return [photos] }
}

const handleBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/orders')
}

const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

const isReviewStatus = computed(() => ['pending_review', 'design_review', 'install_review'].includes(order.value.status))

const canEditOrder = computed(() => {
  const role = userStore.user?.role
  if (role === 'admin') return true
  if (role === 'designer') {
    if (order.value.status === 'design_review' || order.value.status === 'designing')
      return order.value.current_handler_id === userStore.user?.id
  }
  return false
})

const handleEdit = () => router.push(`/orders/${order.value.id}/edit`)

const getFaceDesignDrawings = (faceId) => {
  const drawings = []
  order.value.designScheme?.groups?.forEach(group => {
    const hasFace = group.faceRelations?.some(rel => String(rel.measure_face_id) === String(faceId))
    if (hasFace) group.drawings?.forEach(d => drawings.push(d))
  })
  return drawings
}

const loadFormConfig = async () => {
  try {
    const res = await formApi.getConfig()
    const fieldsMap = {}
    ;(res.data || []).forEach(group => {
      group.fields?.forEach(field => { fieldsMap[field.field_key] = field.field_name })
    })
    formFieldsMap.value = fieldsMap
  } catch (err) { console.error('加载表单配置失败', err) }
}

const loadHandlers = async (role) => {
  try {
    const res = await reviewApi.getHandlers({ role })
    handlers.value = res.data || []
  } catch (err) { console.error(err) }
}

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await orderApi.getDetail(route.params.id)
    order.value = res.data || {}
    logs.value = res.data?.logs || []
    if (isReviewStatus.value) {
      try {
        const reviewRes = await reviewApi.getDetail(route.params.id)
        order.value = { ...order.value, ...reviewRes.data }
      } catch (err) { console.log('审核详情加载失败') }
    }
    if (order.value.status === 'pending_review') await loadHandlers('designer')
  } catch (err) {
    ElMessage.error('获取订单详情失败')
  } finally { loading.value = false }
}

const handleApprove = () => {
  approveForm.handler_id = null
  approveForm.remark = ''
  approveDialogVisible.value = true
}

const submitApprove = async () => {
  if (!approveForm.handler_id) return ElMessage.warning('请选择处理人')
  submitLoading.value = true
  try {
    await reviewApi.approve(order.value.id, approveForm)
    ElMessage.success('审核通过')
    approveDialogVisible.value = false
    router.push('/review')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally { submitLoading.value = false }
}

const handleReject = () => {
  rejectForm.remark = ''
  rejectDialogVisible.value = true
}

const submitReject = async () => {
  if (!rejectForm.remark) return ElMessage.warning('请填写驳回原因')
  submitLoading.value = true
  try {
    await reviewApi.reject(order.value.id, rejectForm)
    ElMessage.success('已驳回')
    rejectDialogVisible.value = false
    router.push('/review')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally { submitLoading.value = false }
}

onMounted(() => { loadFormConfig(); fetchOrder() })
</script>

<style scoped>
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #8c8c8c;
  font-size: 18px;
  flex-shrink: 0;
}

.back-btn:hover { background: var(--bg-tertiary); border-color: var(--brand-primary); color: var(--brand-primary); }

.order-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}

.order-no {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: #1a1a2e;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.designing { background: #ecf5ff; color: #409eff; }
.status-badge.designing .dot { background: #409eff; }
.status-badge.review { background: #fdf6ec; color: #e6a23c; }
.status-badge.review .dot { background: #e6a23c; }
.status-badge.done { background: #f0f9eb; color: #67c23a; }
.status-badge.done .dot { background: #67c23a; }
.status-badge.archived { background: #f0f9eb; color: #67c23a; }
.status-badge.archived .dot { background: #67c23a; }
.status-badge.rejected { background: #fef0f0; color: #f56c6c; }
.status-badge.rejected .dot { background: #f56c6c; }

.breadcrumb {
  font-size: 13px;
  color: #8c8c8c;
}

.top-bar-actions { display: flex; gap: 8px; }

.top-bar-actions .el-button { border-radius: var(--radius-sm); }

/* Main Layout */
.main-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

/* Left Panel */
.info-panel {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-card {
  background: var(--bg-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  font-weight: 600;
  color: #8c8c8c;
}

.info-card-header .el-icon {
  color: #667eea;
  font-size: 16px;
}

.info-card-body {
  padding: 14px 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
}

.info-row + .info-row {
  border-top: 1px solid var(--border-light);
}

.info-label {
  font-size: 12px;
  color: #8c8c8c;
  flex-shrink: 0;
  min-width: 60px;
}

.info-value {
  font-size: 13px;
  color: #262626;
  font-weight: 500;
  text-align: right;
}

.order-no-text {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}

/* Customer Card */
.customer-name {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 10px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #8c8c8c;
}

.contact-item + .contact-item {
  border-top: 1px solid var(--border-light);
}

.contact-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--brand-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--brand-primary);
  font-size: 14px;
}

.contact-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.contact-text span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-label {
  font-size: 11px;
  color: #b0b0b0;
}

/* Requirement Card */
.requirement-text {
  font-size: 13px;
  color: #262626;
  line-height: 1.6;
  background: var(--bg-tertiary);
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px dashed var(--border);
}

/* Progress Card */
.progress-stages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.stage-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stage-dot .el-icon { font-size: 12px; }

.stage-dot.done { background: #f0f9eb; color: #67c23a; }
.stage-dot.current { background: #ecf5ff; color: #409eff; animation: pulse 2s infinite; }
.stage-dot.pending { background: #f0f0f0; color: #b0b0b0; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(64,158,255,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(64,158,255,0); }
}

.stage-name { flex: 1; color: #8c8c8c; }
.stage-name.active { color: #262626; font-weight: 600; }
.stage-handler { color: #b0b0b0; }

/* Right Area */
.design-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Type Group */
.type-group {
  background: var(--bg-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
}

.type-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.type-group-header:hover { background: var(--bg-hover); }

.chevron {
  transition: transform 0.2s;
  color: var(--text-secondary);
}

.chevron.open { transform: rotate(90deg); }

.type-name {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.type-count {
  font-size: 12px;
  color: #8c8c8c;
}

.type-remark {
  font-size: 12px;
  color: #b0b0b0;
  background: var(--bg-tertiary);
  padding: 2px 10px;
  border-radius: 99px;
  margin-left: auto;
}

.type-group-body {
  padding: 0 20px 16px;
}

/* Face Cards */
.face-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.face-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all 0.2s;
}

.face-card:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.1);
}

.face-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.face-name {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}

.face-size {
  font-size: 12px;
  color: #8c8c8c;
  font-family: 'SF Mono', Monaco, monospace;
}

.face-card-body {
  padding: 12px 14px;
}

.face-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
}

.meta-item {
  color: #8c8c8c;
}

.meta-item strong {
  color: #262626;
  font-weight: 600;
}

/* Photo Compare */
.photo-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.photo-slot {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
}

.photo-image {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.photo-slot-label {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  z-index: 1;
}

.photo-slot-label.measure { background: rgba(26,26,46,0.8); }
.photo-slot-label.design { background: rgba(102,126,234,0.8); }

.photo-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: 2px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 12px;
  gap: 4px;
}

.photo-upload-placeholder .el-icon {
  width: 24px;
  height: 24px;
  opacity: 0.4;
  font-size: 24px;
}

.face-remark {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: #b0b0b0;
  line-height: 1.5;
}

/* Log Card */
.log-card {
  background: var(--bg-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.log-header:hover { background: var(--bg-hover); }

.log-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
}

.log-count {
  font-size: 12px;
  color: #8c8c8c;
}

.collapse-icon {
  margin-left: auto;
  font-size: 16px;
  color: #b0b0b0;
  transition: transform 0.2s;
}

.collapse-icon.open { transform: rotate(90deg); }

.log-body {
  padding: 0 20px 16px;
}

.log-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.log-entry:not(:last-child) {
  border-bottom: 1px solid var(--border-light);
}

.log-dot-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
}

.log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.log-dot.latest { background: var(--brand-primary); }

.log-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.log-operator {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  flex-shrink: 0;
}

.log-action {
  font-size: 13px;
  color: #67c23a;
}

.log-remark {
  font-size: 12px;
  color: #b0b0b0;
}

.log-time {
  font-size: 12px;
  color: #b0b0b0;
  flex-shrink: 0;
  margin-left: 12px;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
  .info-panel {
    position: static;
  }
}
</style>
