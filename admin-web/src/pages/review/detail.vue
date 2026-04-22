<template>
  <div class="review-detail" v-loading="loading">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <el-button text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <el-divider direction="vertical" />
        <span class="order-no">{{ order?.order_no }}</span>
        <el-tag :type="getStatusType(order?.status)" size="large">
          {{ getStatusText(order?.status) }}
        </el-tag>
      </div>
      <div class="status-right">
        <el-button type="success" @click="handleApprove">审核通过</el-button>
        <el-button type="danger" @click="handleReject">驳回</el-button>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="main-content">
      <div class="content-wrapper">
        <el-row :gutter="20">
          <!-- 左侧 -->
          <el-col :span="8">
            <!-- 订单信息 -->
            <div class="section-card">
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>订单信息</span>
              </div>
              <div class="card-body">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="订单编号">{{ order?.order_no }}</el-descriptions-item>
                  <el-descriptions-item label="店铺名称">{{ order?.form_data?.company || order?.title || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="客户姓名">{{ order?.customer_name || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="联系电话">{{ order?.customer_phone || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="安装地址">{{ order?.address || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="需求说明">{{ order?.requirement || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ formatDate(order?.created_at) }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </div>

            <!-- 申请现场照片 -->
            <div class="section-card" style="margin-top: 16px" v-if="order?.photos?.length">
              <div class="card-header">
                <el-icon><Camera /></el-icon>
                <span>申请现场照片</span>
              </div>
              <div class="card-body">
                <div class="photos-grid">
                  <el-image
                    v-for="(photo, index) in order.photos"
                    :key="index"
                    :src="getPhotoUrl(photo)"
                    :preview-src-list="order.photos.map(getPhotoUrl)"
                    :preview-teleported="true"
                    fit="cover"
                    class="photo-item"
                    lazy
                  />
                </div>
              </div>
            </div>

            <!-- 操作日志 -->
            <div class="section-card" style="margin-top: 16px">
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>操作日志</span>
              </div>
              <div class="card-body">
                <el-timeline v-if="logs.length > 0">
                  <el-timeline-item
                    v-for="log in logs"
                    :key="log.id"
                    :timestamp="formatDate(log.created_at)"
                    placement="top"
                    size="small"
                  >
                    <div class="log-item">
                      <span class="log-operator">{{ log.operator?.real_name || '系统' }}</span>
                      <span class="log-action">{{ getActionText(log.action) }}</span>
                      <span v-if="log.remark" class="log-remark">{{ log.remark }}</span>
                    </div>
                  </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="暂无操作日志" :image-size="60" />
              </div>
            </div>
          </el-col>

          <!-- 右侧：标签页 -->
          <el-col :span="16">
            <div class="section-card">
              <div class="card-body" style="padding: 0">
                <el-tabs v-model="activeTab">
                  <!-- 当前审核 -->
                  <el-tab-pane name="current">
                    <template #label>
                      <span>
                        <el-badge is-dot :hidden="!isCurrentReviewTab" class="tab-badge">
                          当前审核
                        </el-badge>
                      </span>
                    </template>
                    <div class="tab-content">
                      <template v-if="order?.status === 'pending_review'">
                        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
                          待审核的申请，审核通过后进入设计阶段
                        </el-alert>
                        <div v-if="order?.adItems?.length">
                          <div class="section-sub-title">申请内容</div>
                          <el-table :data="getAllFaces()" stripe size="small" border>
                            <el-table-column label="广告类型" width="120">
                              <template #default="{ row }">{{ row.ad_type_name || '-' }}</template>
                            </el-table-column>
                            <el-table-column prop="face_name" label="面名称" width="100" />
                            <el-table-column label="尺寸(cm)" width="130">
                              <template #default="{ row }">
                                <span v-if="row.width && row.height">{{ row.width }} × {{ row.height }}</span>
                                <span v-else class="text-muted">待测量</span>
                              </template>
                            </el-table-column>
                            <el-table-column label="面积(㎡)" width="100">
                              <template #default="{ row }">
                                <span v-if="row.width && row.height">{{ ((row.width * row.height) / 10000).toFixed(2) }}</span>
                                <span v-else class="text-muted">待测量</span>
                              </template>
                            </el-table-column>
                            <el-table-column label="材质" width="100">
                              <template #default="{ row }">{{ row.material?.name || '-' }}</template>
                            </el-table-column>
                            <el-table-column label="现场照片" width="140">
                              <template #default="{ row }">
                                <div class="photo-thumbnails" v-if="row.photos && parsePhotos(row.photos).length">
                                  <el-image
                                    v-for="(photo, idx) in parsePhotos(row.photos)"
                                    :key="idx"
                                    :src="getPhotoUrl(photo)"
                                    :preview-src-list="parsePhotos(row.photos).map(getPhotoUrl)"
                                    :preview-teleported="true"
                                    fit="cover"
                                    class="photo-thumb"
                                  />
                                </div>
                                <span v-else class="text-muted">无照片</span>
                              </template>
                            </el-table-column>
                            <el-table-column label="备注">
                              <template #default="{ row }">{{ row.remark || '-' }}</template>
                            </el-table-column>
                          </el-table>
                        </div>
                        <el-empty v-else description="暂无申请内容" :image-size="80" />
                      </template>

                      <template v-if="order?.status === 'design_review'">
                        <template v-if="order?.designScheme">
                          <div class="section-sub-title">设计方案</div>
                          <el-descriptions :column="2" border size="small">
                            <el-descriptions-item label="设计师">{{ order.designScheme?.designer?.real_name || '-' }}</el-descriptions-item>
                            <el-descriptions-item label="设计时间">{{ formatDate(order.designScheme?.created_at) }}</el-descriptions-item>
                            <el-descriptions-item label="方案说明" :span="2">{{ order.designScheme?.description || '-' }}</el-descriptions-item>
                          </el-descriptions>
                          <div class="photos-section" v-if="designDrawings.length">
                            <div class="section-sub-title">效果图</div>
                            <div class="photos-grid large">
                              <el-image
                                v-for="(img, index) in designDrawings"
                                :key="index"
                                :src="getPhotoUrl(img.file_url)"
                                :preview-src-list="designDrawings.map(d => getPhotoUrl(d.file_url))"
                                :preview-teleported="true"
                                fit="cover"
                                class="photo-item large"
                              />
                            </div>
                          </div>
                        </template>
                        <template v-else>
                          <el-empty description="设计师尚未提交设计方案" :image-size="80">
                            <template #description>
                              <p>设计师还未提交设计方案</p>
                              <p style="color: #909399; font-size: 12px;">请等待设计师完成设计并提交</p>
                            </template>
                          </el-empty>
                        </template>
                      </template>

                      <template v-if="order?.status === 'install_review' && order?.installReport">
                        <div class="section-sub-title">安装报告</div>
                        <el-descriptions :column="2" border size="small">
                          <el-descriptions-item label="安装员">{{ order.installReport?.installer?.real_name || '-' }}</el-descriptions-item>
                          <el-descriptions-item label="安装日期">{{ order.installReport?.install_date || '-' }}</el-descriptions-item>
                          <el-descriptions-item label="完成情况" :span="2">{{ order.installReport?.completion_rate || 100 }}%</el-descriptions-item>
                          <el-descriptions-item label="客户签字" :span="2">
                            <el-image
                              v-if="order.installReport?.customer_sign"
                              :src="getPhotoUrl(order.installReport.customer_sign)"
                              :preview-teleported="true"
                              style="width: 100px"
                            />
                            <span v-else>-</span>
                          </el-descriptions-item>
                        </el-descriptions>
                        <div class="photos-section" v-if="installPhotos.length">
                          <div class="section-sub-title">安装照片</div>
                          <div class="photos-grid large">
                            <el-image
                              v-for="(photo, index) in installPhotos"
                              :key="index"
                              :src="getPhotoUrl(photo)"
                              :preview-src-list="installPhotos.map(getPhotoUrl)"
                              :preview-teleported="true"
                              fit="cover"
                              class="photo-item large"
                            />
                          </div>
                        </div>
                      </template>
                    </div>
                  </el-tab-pane>

                  <!-- 设计方案（历史可查） -->
                  <el-tab-pane name="design" v-if="order?.designScheme" :disabled="!['design_review', 'producing', 'checking', 'installing', 'install_review', 'archived'].includes(order.status)">
                    <template #label>
                      <span :class="{ 'disabled-tab': !['design_review', 'producing', 'checking', 'installing', 'install_review', 'archived'].includes(order.status) }">
                        设计方案
                      </span>
                    </template>
                    <div class="tab-content">
                      <el-alert v-if="order?.status === 'design_review'" type="info" :closable="false" style="margin-bottom: 12px">
                        当前正在审核此设计方案
                      </el-alert>
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="设计师">{{ order.designScheme?.designer?.real_name || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="设计时间">{{ formatDate(order.designScheme?.created_at) }}</el-descriptions-item>
                        <el-descriptions-item label="方案说明" :span="2">{{ order.designScheme?.description || '-' }}</el-descriptions-item>
                      </el-descriptions>
                      <div class="photos-section" v-if="designDrawings.length">
                        <div class="section-sub-title">效果图</div>
                        <div class="photos-grid large">
                          <el-image
                            v-for="(img, index) in designDrawings"
                            :key="index"
                            :src="getPhotoUrl(img.file_url)"
                            :preview-src-list="designDrawings.map(d => getPhotoUrl(d.file_url))"
                            :preview-teleported="true"
                            fit="cover"
                            class="photo-item large"
                          />
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>

                  <!-- 安装报告（历史可查） -->
                  <el-tab-pane name="install" v-if="order?.installReport" :disabled="!['install_review', 'archived'].includes(order.status)">
                    <template #label>
                      <span :class="{ 'disabled-tab': !['install_review', 'archived'].includes(order.status) }">
                        安装报告
                      </span>
                    </template>
                    <div class="tab-content">
                      <el-alert v-if="order?.status === 'install_review'" type="info" :closable="false" style="margin-bottom: 12px">
                        当前正在审核此安装报告
                      </el-alert>
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="安装员">{{ order.installReport?.installer?.real_name || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="安装日期">{{ order.installReport?.install_date || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="完成情况" :span="2">{{ order.installReport?.completion_rate || 100 }}%</el-descriptions-item>
                        <el-descriptions-item label="客户签字" :span="2">
                          <el-image
                            v-if="order.installReport?.customer_sign"
                            :src="getPhotoUrl(order.installReport.customer_sign)"
                            :preview-teleported="true"
                            style="width: 100px"
                          />
                          <span v-else>-</span>
                        </el-descriptions-item>
                      </el-descriptions>
                      <div class="photos-section" v-if="installPhotos.length">
                        <div class="section-sub-title">安装照片</div>
                        <div class="photos-grid large">
                          <el-image
                            v-for="(photo, index) in installPhotos"
                            :key="index"
                            :src="getPhotoUrl(photo)"
                            :preview-src-list="installPhotos.map(getPhotoUrl)"
                            :preview-teleported="true"
                            fit="cover"
                            class="photo-item large"
                          />
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 审核通过弹窗 -->
    <el-dialog v-model="approveDialogVisible" title="审核通过" width="500px">
      <el-form :model="approveForm" label-width="100px">
        <el-form-item :label="dispatchLabel" v-if="needDispatch">
          <el-select v-model="approveForm.handler_id" :placeholder="dispatchPlaceholder" style="width: 100%">
            <el-option v-for="u in handlers" :key="u.id" :label="`${u.real_name} (${roleMap[u.role]})`" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="approveForm.remark" type="textarea" :rows="2" placeholder="审核备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitApprove">确定</el-button>
      </template>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回" width="500px">
      <el-form :model="rejectForm" label-width="100px">
        <el-form-item label="驳回原因" required>
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
import { ArrowLeft, Document, Clock, Camera } from '@element-plus/icons-vue'
import { reviewApi } from '@/api'
import dayjs from 'dayjs'
import { formatDate } from '@/composables/useFormat'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitLoading = ref(false)
const approveDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const activeTab = ref('current')

const order = ref({})
const logs = ref([])
const handlers = ref([])

const approveForm = reactive({ handler_id: null, remark: '' })
const rejectForm = reactive({ remark: '' })

const statusMap = {
  pending_review: { text: '申请审核', type: 'warning' },
  designing: { text: '设计中', type: '' },
  design_review: { text: '设计审核', type: 'warning' },
  producing: { text: '生产中', type: 'info' },
  checking: { text: '核对中', type: 'info' },
  installing: { text: '安装中', type: 'success' },
  install_review: { text: '安装审核', type: 'warning' },
  archived: { text: '已归档', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
}

const roleMap = {
  admin: '管理员', field_worker: '外勤员', designer: '设计师',
  producer: '生产员'
}

const actionMap = {
  create: '创建订单', update: '更新订单', advance: '推进状态',
  approve: '审核通过', reject: '驳回订单', dispatch: '派单'
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusType = (status) => statusMap[status]?.type || ''
const getActionText = (action) => actionMap[action] || action

const isCurrentReviewTab = computed(() => {
  return ['pending_review', 'design_review', 'install_review'].includes(order.value.status)
})

const needDispatch = computed(() => order.value.status === 'pending_review')

const dispatchLabel = computed(() => order.value.status === 'pending_review' ? '派单设计师' : '派单给')
const dispatchPlaceholder = computed(() => order.value.status === 'pending_review' ? '选择设计师' : '选择处理人')

const designDrawings = computed(() => {
  const drawings = []
  order.value.designScheme?.groups?.forEach(group => { group.drawings?.forEach(d => drawings.push(d)) })
  return drawings
})

const installPhotos = computed(() => {
  const report = order.value.installReport
  if (!report) return []
  const before = report.before_photos ? JSON.parse(report.before_photos) : []
  const after = report.after_photos ? JSON.parse(report.after_photos) : []
  return [...before, ...after]
})

const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

const parsePhotos = (photos) => {
  if (!photos) return []
  if (Array.isArray(photos)) return photos
  try { return JSON.parse(photos) } catch { return [photos] }
}

const getAllFaces = () => {
  const faces = []
  order.value.adItems?.forEach(item => {
    item.faces?.forEach(face => { faces.push({ ...face, ad_type_name: item.adType?.name, material: face.material }) })
  })
  return faces
}

const handleBack = () => router.push('/review')

const loadHandlers = async (role) => {
  try { const res = await reviewApi.getHandlers({ role }); handlers.value = res.data || [] } catch (err) { console.error(err) }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await reviewApi.getDetail(route.params.id)
    order.value = res.data || {}
    logs.value = res.data?.logs || []
    if (order.value.status === 'pending_review') await loadHandlers('designer')
  } catch (err) { ElMessage.error('获取详情失败') }
  finally { loading.value = false }
}

const handleApprove = () => { approveForm.handler_id = null; approveForm.remark = ''; approveDialogVisible.value = true }

const submitApprove = async () => {
  if (needDispatch.value && !approveForm.handler_id) return ElMessage.warning('请选择处理人')
  submitLoading.value = true
  try {
    await reviewApi.approve(order.value.id, { handler_id: approveForm.handler_id, remark: approveForm.remark })
    ElMessage.success('审核通过')
    approveDialogVisible.value = false
    router.push('/review')
  } catch (err) { ElMessage.error(err.response?.data?.message || '操作失败') }
  finally { submitLoading.value = false }
}

const handleReject = () => { rejectForm.remark = ''; rejectDialogVisible.value = true }

const submitReject = async () => {
  if (!rejectForm.remark) return ElMessage.warning('请填写驳回原因')
  submitLoading.value = true
  try {
    await reviewApi.reject(order.value.id, { remark: rejectForm.remark })
    ElMessage.success('已驳回')
    rejectDialogVisible.value = false
    router.push('/review')
  } catch (err) { ElMessage.error(err.response?.data?.message || '操作失败') }
  finally { submitLoading.value = false }
}

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.review-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.section-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #e8e8e8;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.card-body {
  padding: 20px;
}

.photos-section {
  margin-top: 16px;
}

.section-sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #1a1a2e;
}

.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photos-grid.large {
  gap: 12px;
}

.photo-item {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  cursor: pointer;
}

.photo-item.large {
  width: 120px;
  height: 120px;
}

.photo-thumbnails {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.photo-thumb {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  cursor: pointer;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.log-operator {
  font-weight: bold;
  color: var(--el-color-primary);
}

.log-action {
  color: #67C23A;
}

.log-remark {
  color: #909399;
}

.tab-content {
  padding: 20px;
  min-height: 300px;
}

.tab-badge :deep(.el-badge__content.is-dot) {
  background-color: #f56c6c;
}

.disabled-tab {
  color: var(--el-text-color-placeholder);
}

.text-muted {
  color: #909399;
  font-style: italic;
}
</style>
