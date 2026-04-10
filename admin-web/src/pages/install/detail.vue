<template>
  <div class="install-detail-page" v-loading="loading">
    <!-- 流程步骤条 -->
    <div class="flow-bar">
      <div class="flow-bar-header">
        <span class="order-no">{{ order?.order_no }}</span>
        <div class="flow-actions">
          <el-button v-if="order?.status === 'installing'" type="primary" @click="handleInstall">
            <el-icon><EditPen /></el-icon> 填写安装报告
          </el-button>
          <el-button v-if="order?.status === 'install_review'" type="success" @click="handleApprove">
            <el-icon><Check /></el-icon> 审核通过，归档订单
          </el-button>
          <el-button v-if="order?.status === 'install_review'" type="danger" @click="handleReject">驳回</el-button>
          <el-button @click="handleBack">返回列表</el-button>
        </div>
      </div>
      <div class="flow-steps">
        <div v-for="(step, idx) in flowSteps" :key="idx" class="flow-step">
          <div class="step-dot" :class="{ done: step.done, current: step.current }">
            {{ step.done ? '✓' : idx + 1 }}
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
    </div>

    <!-- 订单概要横条 -->
    <div class="summary-card">
      <div class="summary-item">
        <span class="summary-label">客户</span>
        <span class="summary-value">{{ order?.customer?.real_name || '-' }}{{ order?.customer?.phone ? ' · ' + order.customer.phone : '' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">店铺</span>
        <span class="summary-value">{{ order?.form_data?.address || order?.form_data?.company || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">安装员</span>
        <span class="summary-value">{{ order?.handler?.real_name || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">安装日期</span>
        <span class="summary-value">{{ report?.install_date ? formatDate(report.install_date) : '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">满意度</span>
        <span class="summary-value" :style="{ color: satisfactionColor }">{{ satisfactionText }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">地区</span>
        <span class="summary-value">{{ getRegionText }}</span>
      </div>
    </div>

    <!-- 设计方案 -->
    <div class="card">
      <div class="card-header">
        <el-icon><Picture /></el-icon>
        设计方案（安装参考）
        <span class="badge">{{ designGroups.length }} 组图</span>
        <el-button v-if="order?.designScheme?.cdr_file" type="primary" size="small" link @click="downloadCdr" style="margin-left:auto;">
          <el-icon><Download /></el-icon> 下载CDR
        </el-button>
      </div>
      <div class="card-body">
        <div class="design-grid">
          <div v-for="(group, idx) in designGroups" :key="group.id" class="design-item" @click="previewDrawing(group)">
            <div class="design-thumb">
              <template v-if="group.drawings?.[0]?.file_url">
                <el-image :src="getPhotoUrl(group.drawings[0].file_url)" fit="cover" class="design-img" />
              </template>
              <template v-else>
                <div class="placeholder">
                  <el-icon><Picture /></el-icon>
                  设计图 {{ idx + 1 }}
                </div>
              </template>
            </div>
            <div class="design-info">
              <div class="design-name">{{ group.group_name || `图组${idx + 1}` }}</div>
              <div class="design-size">{{ (group.width / 10).toFixed(0) }}×{{ (group.height / 10).toFixed(0) }}cm</div>
              <div class="design-tags">
                <span v-for="fr in group.faceRelations" :key="fr.id" class="tag">{{ fr.face?.face_name }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="designGroups.length === 0" description="暂无设计方案" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 物料清单 - 按广告类型分组 -->
    <div class="card">
      <div class="card-header">
        <el-icon><List /></el-icon>
        安装物料清单
        <span class="badge">{{ measureFaces.length }} 面</span>
      </div>

      <div v-for="(group, gIdx) in groupedFaces" :key="gIdx" class="ad-type-group">
        <div class="ad-type-header" @click="group.collapsed = !group.collapsed">
          <div class="ad-type-icon" :class="'type-' + ((gIdx % 3) + 1)">
            <el-icon><Component :is="group.icon" /></el-icon>
          </div>
          <div>
            <div class="ad-type-name">{{ group.adTypeName }}</div>
            <div class="ad-type-meta">
              <span class="count">{{ group.faces.length }}</span> 个测量面 · {{ group.materialName }}
            </div>
          </div>
          <span class="ad-type-collapse" :class="{ rotated: !group.collapsed }">▶</span>
        </div>
        <div class="ad-type-body" :class="{ collapsed: group.collapsed }">
          <el-table :data="group.faces" size="small" :show-header="true" :border="false">
            <el-table-column type="selection" width="36" />
            <el-table-column label="面名称" prop="face_name" min-width="100">
              <template #default="{ row }">
                <span class="face-name" @click="toggleExpand(row.id)">{{ row.face_name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="尺寸" width="120">
              <template #default="{ row }">
                <span class="face-size">{{ row.width }}×{{ row.height }}cm</span>
              </template>
            </el-table-column>
            <el-table-column label="面积" width="90">
              <template #default="{ row }">
                <span class="face-area">{{ ((row.width * row.height) / 10000).toFixed(2) }}㎡</span>
              </template>
            </el-table-column>
            <el-table-column label="安装前" width="100">
              <template #default="{ row }">
                <div class="thumb-list">
                  <div v-for="(photo, pIdx) in getInstallPhotos(row, 'before').slice(0, 2)" :key="pIdx" class="thumb-img" @click="previewPhotos(getInstallPhotos(row, 'before'))">
                    <el-image :src="getPhotoUrl(photo)" fit="cover" />
                  </div>
                  <span v-if="!getInstallPhotos(row, 'before').length" class="no-photo">无</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="安装图" width="100">
              <template #default="{ row }">
                <div class="thumb-list">
                  <div v-for="(photo, pIdx) in getInstallPhotos(row, 'after').slice(0, 2)" :key="pIdx" class="thumb-img" @click="previewPhotos(getInstallPhotos(row, 'after'))">
                    <el-image :src="getPhotoUrl(photo)" fit="cover" />
                  </div>
                  <span v-if="!getInstallPhotos(row, 'after').length" class="no-photo">无</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="getInstallStatusType(row)">
                  {{ getInstallStatusText(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button text size="small" @click="toggleExpand(row.id)">{{ expandedRows.has(row.id) ? '收起' : '展开' }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 展开行 -->
          <div v-for="face in group.faces" :key="'expand-' + face.id" v-show="expandedRows.has(face.id)" class="expand-content">
            <div class="expand-grid">
              <div class="expand-section">
                <h4>安装前照片</h4>
                <div class="expand-photos">
                  <div v-for="(photo, pIdx) in getInstallPhotos(face, 'before')" :key="pIdx" class="expand-photo" @click="previewPhotos(getInstallPhotos(face, 'before'))">
                    <el-image :src="getPhotoUrl(photo)" fit="cover" class="expand-photo-img" />
                  </div>
                  <span v-if="!getInstallPhotos(face, 'before').length" class="no-photo-text">暂无照片</span>
                </div>
              </div>
              <div class="expand-section">
                <h4>安装后照片</h4>
                <div class="expand-photos">
                  <div v-for="(photo, pIdx) in getInstallPhotos(face, 'after')" :key="pIdx" class="expand-photo" @click="previewPhotos(getInstallPhotos(face, 'after'))">
                    <el-image :src="getPhotoUrl(photo)" fit="cover" class="expand-photo-img" />
                  </div>
                  <span v-if="!getInstallPhotos(face, 'after').length" class="no-photo-text">暂无照片</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-empty v-if="groupedFaces.length === 0" description="暂无物料" :image-size="60" />
    </div>

    <!-- 安装报告 -->
    <div class="card report-card" v-if="report">
      <div class="card-header">
        <el-icon><Document /></el-icon>
        安装报告
        <span class="badge" :style="report.has_issue ? 'background:var(--red-bg);color:var(--red);' : 'background:var(--green-bg);color:var(--green);'">
          {{ report.has_issue ? '有遗留问题' : '已提交' }}
        </span>
      </div>
      <div class="card-body">
        <div class="report-header-meta">
          <div class="report-meta-item">
            <span class="report-meta-label">安装日期</span>
            <span class="report-meta-value">{{ report.install_date ? formatDate(report.install_date) : '-' }}</span>
          </div>
          <div class="report-meta-item">
            <span class="report-meta-label">安装人员</span>
            <span class="report-meta-value">{{ report.installer?.real_name || '-' }}</span>
          </div>
          <div class="report-meta-item">
            <span class="report-meta-label">客户满意度</span>
            <el-tag v-if="report.customer_satisfaction === 'satisfied'" type="success">满意</el-tag>
            <el-tag v-else-if="report.customer_satisfaction === 'basic'" type="info">基本满意</el-tag>
            <el-tag v-else-if="report.customer_satisfaction === 'unsatisfied'" type="danger">不满意</el-tag>
            <span v-else>-</span>
          </div>
          <div class="report-meta-item" v-if="report.customer_sign">
            <span class="report-meta-label">客户签字</span>
            <div class="signature-box" @click="previewPhotos([report.customer_sign])">
              <el-image :src="getPhotoUrl(report.customer_sign)" fit="contain" class="signature-img" />
            </div>
          </div>
        </div>

        <!-- 安装前照片 -->
        <div class="photo-section" v-if="report.before_photos?.length">
          <div class="photo-section-title">
            <span class="dot before"></span>
            安装前照片
          </div>
          <div class="photo-grid">
            <div v-for="(url, i) in report.before_photos" :key="i" class="photo-item" @click="previewPhotos(report.before_photos)">
              <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-img" />
            </div>
          </div>
        </div>

        <!-- 安装后照片 -->
        <div class="photo-section" v-if="report.after_photos?.length">
          <div class="photo-section-title">
            <span class="dot after"></span>
            安装后照片
          </div>
          <div class="photo-grid">
            <div v-for="(url, i) in report.after_photos" :key="i" class="photo-item" @click="previewPhotos(report.after_photos)">
              <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-img" />
            </div>
          </div>
        </div>

        <!-- 整体效果 -->
        <div class="photo-section" v-if="report.overall_photos?.length">
          <div class="photo-section-title">
            <span class="dot overall"></span>
            整体效果
          </div>
          <div class="photo-grid">
            <div v-for="(url, i) in report.overall_photos" :key="i" class="photo-item" @click="previewPhotos(report.overall_photos)">
              <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-img" />
            </div>
          </div>
        </div>

        <!-- 遗留问题 -->
        <div class="issue-box" v-if="report.has_issue">
          <strong>遗留问题：</strong>
          {{ report.issue_desc || '-' }}
        </div>

        <!-- 备注 -->
        <div v-if="report.remark" style="margin-top:16px;">
          <strong style="font-size:13px;">备注：</strong>
          <p style="margin-top:4px; color:var(--text-secondary); font-size:13px;">{{ report.remark }}</p>
        </div>
      </div>
    </div>

    <!-- 未提交报告提示 -->
    <div class="card" v-if="!report && order?.status === 'installing'">
      <div class="card-body" style="text-align:center; padding:40px;">
        <el-empty description="尚未提交安装报告">
          <el-button type="primary" @click="handleInstall">去填写报告</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 底部标签页 -->
    <div class="bottom-tabs">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="操作日志" name="logs">
          <div class="timeline">
            <div v-for="(log, i) in logs" :key="log.id" class="timeline-item">
              <div class="timeline-dot" :class="{ latest: i === 0 }"></div>
              <div class="timeline-time">{{ formatDate(log.created_at) }}</div>
              <div class="timeline-body">
                <span class="timeline-user">{{ log.operator?.real_name || '系统' }}</span>
                <span class="timeline-action">{{ getActionText(log.action) }}</span>
                <span v-if="log.remark" class="timeline-remark">{{ log.remark }}</span>
              </div>
            </div>
            <el-empty v-if="logs.length === 0" description="暂无日志" :image-size="60" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="备注" name="remark">
          <el-input v-model="remarkText" type="textarea" :rows="3" placeholder="填写备注说明..." class="remark-textarea" />
          <div class="remark-actions" style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
            <el-button @click="remarkText = ''">取消</el-button>
            <el-button type="primary">保存备注</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 图片预览 -->
    <el-image-viewer v-if="previewVisible" :url-list="previewUrls" @close="previewVisible = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Download, Document, EditPen, Check, List, Shop, Monitor, Lightning } from '@element-plus/icons-vue'
import { installApi, orderApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const orderId = route.params.id

const loading = ref(false)
const order = ref(null)
const report = ref(null)
const logs = ref([])
const measureFaces = ref([])
const activeTab = ref('logs')
const expandedRows = ref(new Set())
const previewVisible = ref(false)
const previewUrls = ref([])
const remarkText = ref('')

const designGroups = computed(() => order.value?.designScheme?.groups || [])

// 流程步骤
const flowStepDefs = [
  { label: '申请测量' }, { label: '审核' }, { label: '测量作业' },
  { label: '测量审核' }, { label: '设计' }, { label: '设计审核' },
  { label: '生产' }, { label: '核对' }, { label: '安装' },
  { label: '安装审核' }, { label: '归档' }
]

const flowSteps = computed(() => {
  const statusOrder = ['pending_review', 'pending_review', 'measuring', 'measure_review', 'designing', 'design_review', 'producing', 'checking', 'installing', 'install_review', 'archived']
  const currentIdx = statusOrder.indexOf(order.value?.status)
  return flowStepDefs.map((s, i) => ({
    label: s.label,
    done: currentIdx > 0 && i < currentIdx,
    current: i === currentIdx
  }))
})

// 地区文本
const getRegionText = computed(() => {
  const g = order.value?.group
  const parts = []
  if (g?.district?.province) parts.push(g.district.province.name)
  if (g?.district) parts.push(g.district.name)
  if (g) parts.push(g.name)
  return parts.length ? parts.join(' · ') : '-'
})

// 满意度
const satisfactionText = computed(() => {
  const map = { satisfied: '满意', basic: '基本满意', unsatisfied: '不满意' }
  return map[report.value?.customer_satisfaction] || '-'
})
const satisfactionColor = computed(() => {
  const map = { satisfied: '#10b981', basic: '#f59e0b', unsatisfied: '#ef4444' }
  return map[report.value?.customer_satisfaction] || 'inherit'
})

// 图标映射
const iconMap = { '门头招牌': Shop, '灯箱广告': Monitor, '发光字': Lightning, '背景墙': Picture, '默认': Document }
const getIcon = (name) => iconMap[name] || iconMap['默认']

// 按广告类型分组
const groupedFaces = computed(() => {
  const groups = {}
  measureFaces.value.forEach(face => {
    const typeName = face.adItem?.adType?.name || '未分类'
    const materialName = face.material?.name || '-'
    if (!groups[typeName]) {
      groups[typeName] = {
        adTypeName: typeName,
        materialName,
        icon: getIcon(typeName),
        faces: [],
        collapsed: false
      }
    }
    groups[typeName].faces.push(face)
  })
  return Object.values(groups)
})

// 格式化
const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
const getActionText = (action) => {
  const map = { install_submit: '提交安装报告', install_complete: '完成安装', install_approve: '安装审核通过', install_reject: '安装驳回' }
  return map[action] || action
}

// 照片URL
const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

// 获取安装照片
const getInstallPhotos = (face, type) => {
  if (type === 'before') {
    if (!face.install_before_photos) return []
    if (Array.isArray(face.install_before_photos)) return face.install_before_photos
    try { return JSON.parse(face.install_before_photos) } catch { return [face.install_before_photos] }
  }
  if (type === 'after') {
    if (!face.install_after_photos) return []
    if (Array.isArray(face.install_after_photos)) return face.install_after_photos
    try { return JSON.parse(face.install_after_photos) } catch { return [face.install_after_photos] }
  }
  return []
}

// 安装状态
const getInstallStatusType = (face) => {
  return face.install_status === 'installed' ? 'success' : 'info'
}
const getInstallStatusText = (face) => {
  return face.install_status === 'installed' ? '已安装' : '待安装'
}

// 展开/收起
const toggleExpand = (faceId) => {
  const set = expandedRows.value
  if (set.has(faceId)) set.delete(faceId)
  else set.add(faceId)
  expandedRows.value = new Set(set)
}

// 预览图片
const previewPhotos = (urls) => {
  previewUrls.value = urls.map(u => getPhotoUrl(u))
  previewVisible.value = true
}

const previewDrawing = (group) => {
  if (group.drawings?.[0]?.file_url) {
    previewPhotos(group.drawings.map(d => d.file_url))
  }
}

const downloadCdr = () => { if (order.value?.designScheme?.cdr_file) window.open(order.value.designScheme.cdr_file, '_blank') }

// 填写安装报告
const handleInstall = () => router.push(`/install/${orderId}/report`)

// 返回
const handleBack = () => router.push('/install')

// 审核通过
const handleApprove = async () => {
  try {
    await ElMessageBox.confirm('确定审核通过该安装报告吗？审核通过后订单将归档。', '审核确认', { type: 'warning' })
    await installApi.approve(orderId)
    ElMessage.success('审核通过，订单已归档')
    router.push('/install')
  } catch (err) { if (err !== 'cancel') ElMessage.error('审核失败') }
}

// 驳回
const handleReject = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
      inputType: 'textarea',
      inputPlaceholder: '请说明驳回原因...'
    })
    await installApi.reject(orderId, value)
    ElMessage.success('已驳回')
    router.push('/install')
  } catch (err) { if (err !== 'cancel') ElMessage.error('驳回失败') }
}

// 加载详情
const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await installApi.getDetail(orderId)
    order.value = res.data
    measureFaces.value = res.data.measureFaces || []
    try { const reportRes = await installApi.getReport(orderId); report.value = reportRes.data } catch (e) {}
    try { const logRes = await orderApi.getLogs(orderId); logs.value = logRes.data || [] } catch (e) { logs.value = [] }
  } catch (err) { ElMessage.error('获取详情失败') }
  finally { loading.value = false }
}

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.install-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ===== 流程步骤条 ===== */
.flow-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.flow-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.order-no {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-primary);
}
.flow-actions { display: flex; gap: 8px; }

.flow-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: 0 40px;
}
.flow-steps::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 40px;
  right: 40px;
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.flow-steps::after {
  content: '';
  position: absolute;
  top: 16px;
  left: 40px;
  width: calc((100% - 80px) * 0.78);
  height: 2px;
  background: var(--brand-primary);
  z-index: 1;
}
.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
}
.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  background: var(--card-bg);
  border: 2px solid var(--border);
  color: var(--text-secondary);
  transition: all 0.2s;
}
.step-dot.done {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.step-dot.current {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(99,102,241,0.2);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.1); }
}
.step-label {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.step-dot.done + .step-label,
.step-dot.current + .step-label {
  color: var(--brand-primary);
  font-weight: 600;
}

/* ===== 订单概要卡片 ===== */
.summary-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 0;
}
.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.summary-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
  margin: 0 12px;
}

/* ===== 卡片通用 ===== */
.card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: #fafbfc;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.card-header .badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  background: var(--brand-primary-light);
  color: var(--brand-primary);
  padding: 2px 8px;
  border-radius: 99px;
}
.card-body { padding: 16px 20px; }

/* ===== 设计方案 ===== */
.design-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.design-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.design-item:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  transform: translateY(-2px);
}
.design-thumb {
  width: 100%;
  height: 120px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
}
.design-thumb .placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.5;
}
.design-img { width: 100%; height: 100%; object-fit: cover; }
.design-info { padding: 8px 10px; font-size: 12px; }
.design-name { font-weight: 600; color: var(--text-primary); }
.design-size { color: var(--text-secondary); font-family: monospace; font-size: 11px; }
.design-tags { display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
.design-tags .tag {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--bg-page, #f1f5f9);
  border-radius: 4px;
  color: var(--text-secondary);
}

/* ===== 物料清单 - 按广告类型分组 ===== */
.ad-type-group { border-bottom: 1px solid var(--border); }
.ad-type-group:last-child { border-bottom: none; }

.ad-type-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #fafbfc;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.ad-type-header:hover { background: #f0f2f5; }

.ad-type-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}
.ad-type-icon.type-1 { background: #6366f1; }
.ad-type-icon.type-2 { background: #f59e0b; }
.ad-type-icon.type-3 { background: #10b981; }

.ad-type-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.ad-type-meta { font-size: 12px; color: var(--text-secondary); }
.ad-type-meta .count { color: var(--brand-primary); font-weight: 600; }

.ad-type-collapse {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}
.ad-type-collapse.rotated { transform: rotate(90deg); }

.ad-type-body {
  border-top: 1px solid var(--border-light, #f1f5f9);
  transition: max-height 0.3s ease;
  overflow: hidden;
}
.ad-type-body.collapsed { max-height: 0; }

/* 表格内 */
.face-name { font-weight: 600; color: var(--text-primary); cursor: pointer; }
.face-name:hover { color: var(--brand-primary); }
.face-size { font-family: monospace; color: var(--text-secondary); font-size: 12px; }
.face-area { font-weight: 600; color: var(--brand-primary); font-size: 13px; }

.thumb-list { display: flex; gap: 4px; }
.thumb-img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-page, #f1f5f9);
}
.thumb-img:hover { box-shadow: var(--shadow-sm); }
.no-photo { font-size: 11px; color: var(--text-secondary); }

/* 展开行 */
.expand-content {
  padding: 16px 20px;
  background: var(--bg-page, #f1f5f9);
}
.expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.expand-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.expand-photos { display: flex; gap: 8px; flex-wrap: wrap; }
.expand-photo {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  background: var(--card-bg);
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
}
.expand-photo:hover { border-color: var(--brand-primary); }
.expand-photo-img { width: 100%; height: 100%; object-fit: cover; }
.no-photo-text { font-size: 11px; color: var(--text-secondary); line-height: 80px; }

/* ===== 安装报告 ===== */
.report-header-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.report-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.report-meta-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.report-meta-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.signature-box {
  width: 160px;
  height: 80px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 11px;
  background: #fafbfc;
  cursor: pointer;
  overflow: hidden;
}
.signature-img { width: 100%; height: 100%; object-fit: contain; }

/* 照片 */
.photo-section { margin-top: 24px; }
.photo-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.photo-section-title .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot.before { background: #f59e0b; }
.dot.after { background: #10b981; }
.dot.overall { background: var(--brand-primary); }

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.photo-item {
  height: 120px;
  border-radius: var(--radius-md);
  background: var(--bg-page, #f1f5f9);
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.photo-item:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
  transform: translateY(-2px);
}
.photo-img { width: 100%; height: 100%; object-fit: cover; }

/* 遗留问题 */
.issue-box {
  margin-top: 16px;
  padding: 14px 18px;
  background: var(--red-bg, #fef2f2);
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #991b1b;
  font-size: 13px;
}

/* ===== 底部标签页 ===== */
.bottom-tabs {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.remark-textarea { width: 100%; }

/* 时间线 */
.timeline { padding: 8px 20px 16px; }
.timeline-item {
  position: relative;
  padding-left: 24px;
  padding-bottom: 16px;
}
.timeline-item:last-child { padding-bottom: 0; }
.timeline::before {
  content: '';
  position: absolute;
  left: 27px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
}
.timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border);
  border: 2px solid var(--card-bg);
}
.timeline-dot.latest { background: var(--brand-primary); }
.timeline-time { font-size: 11px; color: var(--text-secondary); margin-bottom: 2px; }
.timeline-body { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.timeline-user { font-weight: 600; color: var(--text-primary); }
.timeline-action { color: #10b981; }
.timeline-remark { color: var(--text-secondary); font-size: 12px; }

/* 响应式 */
@media (max-width: 1100px) {
  .summary-card { flex-wrap: wrap; }
  .summary-divider { display: none; }
  .summary-item { min-width: calc(50% - 8px); margin-bottom: 8px; }
}
@media (max-width: 768px) {
  .flow-steps { overflow-x: auto; padding-bottom: 8px; }
  .step-label { font-size: 10px; }
  .expand-grid { grid-template-columns: 1fr; }
}
</style>
