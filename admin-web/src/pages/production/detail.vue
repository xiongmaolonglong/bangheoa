<template>
  <div class="production-detail-page" v-loading="loading">
    <!-- 流程步骤条 -->
    <div class="flow-bar">
      <div class="flow-bar-header">
        <span class="order-no">{{ order?.order_no }}</span>
        <div class="flow-actions">
          <el-button @click="handlePrint">
            <el-icon><Printer /></el-icon> 打印工单
          </el-button>
          <el-button v-if="order?.status === 'producing'" type="success" :loading="submitting" @click="handleComplete">
            完成生产，提交核对
          </el-button>
          <template v-if="order?.status === 'checking'">
            <el-button @click="handleBatchPass" :disabled="pendingCount === 0">
              批量通过 ({{ pendingCount }})
            </el-button>
            <el-button type="danger" @click="handleReject">返工</el-button>
            <el-button type="success" :loading="submitting" @click="handleCheckPass">
              核对通过，进入安装
            </el-button>
          </template>
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
        <span class="summary-value">{{ order?.customer?.real_name || '-' }} · {{ order?.customer?.phone || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">店铺</span>
        <span class="summary-value">{{ order?.form_data?.address || order?.form_data?.company || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">生产员</span>
        <span class="summary-value">{{ order?.handler?.real_name || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">创建时间</span>
        <span class="summary-value">{{ formatDate(order?.created_at) }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">地区</span>
        <span class="summary-value">{{ getRegionText }}</span>
      </div>
    </div>

    <!-- 设计方案 + 进度统计 双栏 -->
    <div class="dual-row">
      <!-- 设计方案 -->
      <div class="card">
        <div class="card-header">
          <el-icon><Picture /></el-icon>
          设计方案
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
                  <el-image :src="getPhotoUrl(group.drawings[0].file_url)" fit="cover" class="design-img" lazy />
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

      <!-- 进度统计 -->
      <div class="card">
        <div class="card-header">
          <el-icon><DataAnalysis /></el-icon>
          生产进度
        </div>
        <div class="card-body">
          <div class="progress-stats">
            <div class="stat-box">
              <div class="stat-value">{{ measureFaces.length }}</div>
              <div class="stat-label">总面数</div>
            </div>
            <div class="stat-box highlight">
              <div class="stat-value">{{ totalArea.toFixed(2) }}</div>
              <div class="stat-label">总面积 (㎡)</div>
            </div>
            <div class="stat-box success">
              <div class="stat-value" v-if="order?.status === 'producing'">{{ completedCount }}</div>
              <div class="stat-value" v-else-if="order?.status === 'checking'">{{ passedCount }}</div>
              <div class="stat-value" v-else>-</div>
              <div class="stat-label" v-if="order?.status === 'producing'">已完成</div>
              <div class="stat-label" v-else-if="order?.status === 'checking'">已核对</div>
              <div class="stat-label" v-else>进度</div>
            </div>
            <div class="stat-box warning">
              <div class="stat-value" v-if="order?.status === 'producing'">{{ measureFaces.length - completedCount }}</div>
              <div class="stat-value" v-else-if="order?.status === 'checking'">{{ pendingCount }}</div>
              <div class="stat-value" v-else>-</div>
              <div class="stat-label" v-if="order?.status === 'producing'">待生产</div>
              <div class="stat-label" v-else-if="order?.status === 'checking'">待核对</div>
              <div class="stat-label" v-else>进度</div>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="progress-text">
              <span>进度</span>
              <strong>{{ progressPercent }}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 物料清单 - 按广告类型分组 -->
    <div class="card material-card">
      <div class="card-header">
        <el-icon><List /></el-icon>
        物料清单
        <span class="badge">{{ measureFaces.length }} 面 · {{ groupedFaces.length }} 种类型</span>
        <div class="toolbar-right" style="margin-left:auto;">
          <el-select v-model="faceFilter" size="small" style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="待生产" value="pending" />
            <el-option label="生产中" value="producing" />
            <el-option label="已完成" value="completed" />
          </el-select>
          <el-button v-if="order?.status === 'producing'" size="small" @click="batchSetCompleted">
            批量标记完成
          </el-button>
        </div>
      </div>

      <div v-for="(group, gIdx) in filteredGroupedFaces" :key="gIdx" class="ad-type-group">
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
          <div class="ad-type-status">
            <div class="ad-type-progress">
              <div class="ad-type-progress-fill" :style="{ width: group.progress + '%' }"></div>
            </div>
            <span class="ad-type-progress-text">{{ group.completedCount }}/{{ group.faces.length }}</span>
            <span class="ad-type-collapse" :class="{ rotated: !group.collapsed }">▶</span>
          </div>
        </div>
        <div class="ad-type-body" :class="{ collapsed: group.collapsed }">
          <el-table :data="group.faces" size="small" :show-header="true" :border="false" row-key="id">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand-content">
                  <div class="expand-grid">
                    <div class="expand-section">
                      <h4>实物照片</h4>
                      <div class="expand-photos">
                        <div v-for="(photo, pIdx) in getFacePhotos(row)" :key="pIdx" class="expand-photo" @click="previewPhoto(getFacePhotos(row))">
                          <el-image :src="getPhotoUrl(photo)" fit="cover" :preview-src-list="[]" class="expand-photo-img" lazy />
                        </div>
                        <span v-if="!getFacePhotos(row).length" class="no-photo-text">暂无照片</span>
                      </div>
                    </div>
                    <div class="expand-section">
                      <h4>设计图</h4>
                      <div class="expand-photos">
                        <template v-if="getFaceDesign(row.id)">
                          <div class="expand-photo" @click="previewPhoto([getFaceDesign(row.id)])">
                            <el-image :src="getPhotoUrl(getFaceDesign(row.id))" fit="cover" class="expand-photo-img" lazy />
                          </div>
                        </template>
                        <span v-else class="no-photo-text">暂无设计图</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="order?.status === 'producing' || order?.status === 'checking'" class="expand-remark">
                    <el-select v-if="order?.status === 'producing'" v-model="row.production_status" size="small" @change="updateFaceStatus(row)">
                      <el-option label="待生产" value="pending" />
                      <el-option label="生产中" value="producing" />
                      <el-option label="已完成" value="completed" />
                    </el-select>
                    <el-select v-else-if="order?.status === 'checking'" v-model="row.check_status" size="small" @change="updateCheckStatus(row)">
                      <el-option label="待核对" value="pending" />
                      <el-option label="通过" value="passed" />
                      <el-option label="返工" value="rework" />
                    </el-select>
                    <el-input v-model="row.check_remark" size="small" placeholder="备注..." style="flex:1;" />
                    <el-button type="primary" size="small" @click="saveFaceRemark(row)">保存</el-button>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column type="selection" width="36" v-if="order?.status === 'producing'" />
            <el-table-column label="面名称" prop="face_name" min-width="100">
              <template #default="{ row }">
                <span class="face-name">{{ row.face_name }}</span>
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
            <el-table-column label="缩略图" width="100">
              <template #default="{ row }">
                <div class="thumb-list">
                  <div v-for="(photo, pIdx) in getFacePhotos(row).slice(0, 2)" :key="pIdx" class="thumb-img" @click="previewPhoto(getFacePhotos(row))">
                    <el-image :src="getPhotoUrl(photo)" fit="cover" :preview-src-list="[]" lazy />
                  </div>
                  <span v-if="!getFacePhotos(row).length" class="no-photo">无</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-select v-if="order?.status === 'producing'" v-model="row.production_status" size="small" @change="updateFaceStatus(row)">
                  <el-option label="待生产" value="pending" />
                  <el-option label="生产中" value="producing" />
                  <el-option label="已完成" value="completed" />
                </el-select>
                <el-select v-else-if="order?.status === 'checking'" v-model="row.check_status" size="small" @change="updateCheckStatus(row)">
                  <el-option label="待核对" value="pending" />
                  <el-option label="通过" value="passed" />
                  <el-option label="返工" value="rework" />
                </el-select>
                <el-tag v-else size="small" :type="getFaceTagType(row)">
                  {{ getFaceTagText(row) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <el-empty v-if="filteredGroupedFaces.length === 0" description="暂无物料" :image-size="60" />
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
          <el-input v-model="checkForm.remark" type="textarea" :rows="3" placeholder="填写备注说明..." class="remark-textarea" />
          <div class="remark-actions" style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
            <el-button @click="checkForm.remark = ''">取消</el-button>
            <el-button type="primary" @click="handleSaveRemark">保存备注</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 返工弹窗 -->
    <el-dialog v-model="rejectVisible" title="返工原因" width="420px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写返工原因..." />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitReject">确认返工</el-button>
      </template>
    </el-dialog>

    <!-- 打印区域（隐藏） -->
    <div class="print-area" ref="printArea">
      <div class="print-header">
        <h1>生产工单</h1>
        <div class="print-order-no">{{ order?.order_no }}</div>
      </div>
      <div class="print-info">
        <div class="print-row"><span>客户：</span>{{ order?.customer?.real_name }}</div>
        <div class="print-row"><span>电话：</span>{{ order?.customer?.phone }}</div>
        <div class="print-row"><span>地址：</span>{{ order?.form_data?.address }}</div>
        <div class="print-row"><span>生产员：</span>{{ order?.handler?.real_name }}</div>
      </div>
      <table class="print-table">
        <thead>
          <tr><th>序号</th><th>名称</th><th>尺寸</th><th>面积</th><th>材质</th><th>类型</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr v-for="(face, idx) in measureFaces" :key="face.id">
            <td>{{ idx + 1 }}</td>
            <td>{{ face.face_name }}</td>
            <td>{{ face.width }}×{{ face.height }}cm</td>
            <td>{{ ((face.width * face.height) / 10000).toFixed(2) }}㎡</td>
            <td>{{ face.material?.name || '-' }}</td>
            <td>{{ face.adItem?.adType?.name || '-' }}</td>
            <td>{{ getFaceTagText(face) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="3">合计</td><td>{{ totalArea.toFixed(2) }}㎡</td><td colspan="3">{{ measureFaces.length }} 面</td></tr>
        </tfoot>
      </table>
    </div>

    <!-- 图片预览 -->
    <el-image-viewer v-if="previewVisible" :url-list="previewUrls" @close="previewVisible = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Download, Printer, Picture, DataAnalysis, List, Shop,
  Monitor, Lightning, Box, DocumentChecked
} from '@element-plus/icons-vue'
import { productionApi, orderApi } from '@/api'
import dayjs from 'dayjs'
import { formatDate } from '@/composables/useFormat'

const router = useRouter()
const route = useRoute()
const orderId = route.params.id

const loading = ref(false)
const submitting = ref(false)
const order = ref(null)
const measureFaces = ref([])
const logs = ref([])
const activeTab = ref('logs')
const rejectVisible = ref(false)
const rejectReason = ref('')
const printArea = ref(null)
const faceFilter = ref('')
const previewVisible = ref(false)
const previewUrls = ref([])

const checkForm = reactive({ remark: '' })

// 流程步骤
const flowStepDefs = [
  { label: '申请测量', key: 'pending_review' },
  { label: '审核', key: 'pending_review' },
  { label: '测量作业', key: 'measuring' },
  { label: '测量审核', key: 'measure_review' },
  { label: '设计', key: 'designing' },
  { label: '设计审核', key: 'design_review' },
  { label: '生产', key: 'producing' },
  { label: '核对', key: 'checking' },
  { label: '安装', key: 'installing' },
  { label: '安装审核', key: 'install_review' },
  { label: '归档', key: 'archived' }
]

const flowSteps = computed(() => {
  const statusOrder = flowStepDefs.map(s => s.key)
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

// 设计方案分组
const designGroups = computed(() => order.value?.designScheme?.groups || [])

// 总面积
const totalArea = computed(() => measureFaces.value.reduce((sum, f) => sum + ((f.width || 0) * (f.height || 0) / 10000), 0))

// 计数
const completedCount = computed(() => measureFaces.value.filter(f => f.production_status === 'completed').length)
const passedCount = computed(() => measureFaces.value.filter(f => f.check_status === 'passed').length)
const pendingCount = computed(() => measureFaces.value.filter(f => f.check_status === 'pending' || !f.check_status).length)

// 进度百分比
const progressPercent = computed(() => {
  if (measureFaces.value.length === 0) return 0
  if (order.value?.status === 'producing') return Math.round((completedCount.value / measureFaces.value.length) * 100)
  if (order.value?.status === 'checking') return Math.round((passedCount.value / measureFaces.value.length) * 100)
  return 0
})

// 图标映射
const iconMap = { '门头招牌': Shop, '灯箱广告': Monitor, '发光字': Lightning, '背景墙': Picture, '默认': DocumentChecked }
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
        completedCount: 0,
        progress: 0,
        collapsed: false
      }
    }
    groups[typeName].faces.push(face)
    const isDone = order.value?.status === 'checking' ? face.check_status === 'passed' : face.production_status === 'completed'
    if (isDone) groups[typeName].completedCount++
  })
  Object.values(groups).forEach(g => {
    g.progress = g.faces.length ? Math.round((g.completedCount / g.faces.length) * 100) : 0
  })
  return Object.values(groups)
})

// 过滤后的分组
const filteredGroupedFaces = computed(() => {
  if (!faceFilter.value) return groupedFaces.value
  return groupedFaces.value.map(g => ({
    ...g,
    faces: g.faces.filter(f => {
      const status = order.value?.status === 'checking' ? f.check_status : f.production_status
      return status === faceFilter.value
    })
  })).filter(g => g.faces.length > 0)
})

const getActionText = (action) => {
  const map = { design_approve: '设计审核通过', design_reject: '设计审核驳回', production_start: '开始生产', production_complete: '完成生产', check_pass: '核对通过', check_reject: '核对返工' }
  return map[action] || action
}

// 照片URL
const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

// 获取面的照片
const getFacePhotos = (face) => {
  if (!face.photos) return []
  if (Array.isArray(face.photos)) return face.photos
  try { return JSON.parse(face.photos) } catch { return [face.photos] }
}

// 获取面的设计图
const getFaceDesign = (faceId) => {
  for (const group of designGroups.value) {
    if (group.faceRelations?.some(r => String(r.measure_face_id) === String(faceId))) {
      return group.drawings?.[0]?.file_url || null
    }
  }
  return null
}

// 面的状态标签
const getFaceTagType = (face) => {
  if (face.check_status === 'passed') return 'success'
  if (face.check_status === 'rework') return 'danger'
  if (face.production_status === 'completed') return 'info'
  if (face.production_status === 'producing') return 'primary'
  return 'warning'
}
const getFaceTagText = (face) => {
  if (face.check_status === 'passed') return '已通过'
  if (face.check_status === 'rework') return '返工'
  if (face.production_status === 'completed') return '已完成'
  if (face.production_status === 'producing') return '生产中'
  return '待生产'
}

// 预览图片
const previewPhoto = (urls) => {
  previewUrls.value = urls.map(u => getPhotoUrl(u))
  previewVisible.value = true
}

// 预览设计图
const previewDrawing = (group) => {
  if (group.drawings?.[0]?.file_url) {
    previewPhoto(group.drawings.map(d => d.file_url))
  }
}

// 下载CDR
const downloadCdr = () => { if (order.value?.designScheme?.cdr_file) window.open(order.value.designScheme.cdr_file, '_blank') }

// 更新面状态
const updateFaceStatus = async (face) => {
  try {
    await productionApi.updateFace(face.id, { production_status: face.production_status })
    ElMessage.success('状态已更新')
  } catch (err) { ElMessage.error('更新失败') }
}

const updateCheckStatus = async (face) => {}

// 保存备注
const saveFaceRemark = async (face) => {
  try {
    await productionApi.updateFace(face.id, { check_remark: face.check_remark })
    ElMessage.success('备注已保存')
  } catch (err) { ElMessage.error('保存失败') }
}

// 批量标记完成
const batchSetCompleted = async () => {
  if (measureFaces.value.length === 0) return ElMessage.warning('暂无可操作的面')
  try {
    await ElMessageBox.confirm('确认将所有待生产的面标记为已完成？', '批量操作')
    for (const face of measureFaces.value) {
      if (face.production_status !== 'completed') {
        face.production_status = 'completed'
        await productionApi.updateFace(face.id, { production_status: 'completed' })
      }
    }
    ElMessage.success('已全部标记为已完成')
  } catch (err) { if (err !== 'cancel') ElMessage.error('操作失败') }
}

// 批量通过
const handleBatchPass = async () => {
  if (pendingCount.value === 0) return ElMessage.warning('没有待核对的项')
  try {
    await ElMessageBox.confirm(`确认将 ${pendingCount.value} 项全部标记为通过并提交核对？`, '批量通过')
    submitting.value = true
    // 先更新前端状态
    measureFaces.value.forEach(f => { if (f.check_status === 'pending' || !f.check_status) f.check_status = 'passed' })
    // 调用后端推进订单状态
    await productionApi.submitCheck(orderId, {
      remark: checkForm.remark,
      checkItems: measureFaces.value.map(f => ({ id: f.id, check_status: f.check_status, check_remark: f.check_remark }))
    })
    ElMessage.success('全部通过，已进入安装阶段')
    router.push('/install')
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.response?.data?.message || '操作失败') }
  finally { submitting.value = false }
}

// 完成生产
const handleComplete = async () => {
  const incomplete = measureFaces.value.filter(f => f.production_status !== 'completed')
  if (incomplete.length > 0) {
    try { await ElMessageBox.confirm(`还有 ${incomplete.length} 面未完成，确认提交核对？`, '提示') } catch { return }
  }
  try {
    await ElMessageBox.confirm('确认完成生产并提交核对？', '完成生产')
    submitting.value = true
    await productionApi.complete(orderId)
    ElMessage.success('已提交核对')
    router.push('/production')
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.response?.data?.message || '操作失败') }
  finally { submitting.value = false }
}

// 返工
const handleReject = () => { rejectReason.value = ''; rejectVisible.value = true }
const submitReject = async () => {
  if (!rejectReason.value) return ElMessage.warning('请填写返工原因')
  try {
    submitting.value = true
    await productionApi.reject(orderId, { reason: rejectReason.value })
    ElMessage.success('已返回生产')
    rejectVisible.value = false
    router.push('/production')
  } catch (err) { ElMessage.error('操作失败') }
  finally { submitting.value = false }
}

// 核对通过
const handleCheckPass = async () => {
  const pending = measureFaces.value.filter(f => f.check_status === 'pending' || !f.check_status)
  if (pending.length > 0) return ElMessage.warning(`还有 ${pending.length} 项未核对`)
  try {
    await ElMessageBox.confirm('确认核对通过，订单将进入安装阶段？', '核对通过')
    submitting.value = true
    await productionApi.submitCheck(orderId, {
      remark: checkForm.remark,
      checkItems: measureFaces.value.map(f => ({ id: f.id, check_status: f.check_status, check_remark: f.check_remark }))
    })
    ElMessage.success('核对完成，已进入安装阶段')
    router.push('/install')
  } catch (err) { if (err !== 'cancel') ElMessage.error(err.response?.data?.message || '操作失败') }
  finally { submitting.value = false }
}

// 保存备注
const handleSaveRemark = async () => {
  if (!checkForm.remark) return ElMessage.warning('请填写备注内容')
  ElMessage.success('备注已保存')
}

// 打印
const handlePrint = () => {
  const printContent = printArea.value.innerHTML
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`<!DOCTYPE html><html><head><title>生产工单 - ${order.value?.order_no}</title><style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; } .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; } .print-header h1 { font-size: 24px; } .print-order-no { font-size: 14px; color: #666; margin-top: 5px; } .print-info { margin-bottom: 15px; } .print-row { font-size: 14px; line-height: 1.8; } .print-row span { display: inline-block; width: 60px; color: #666; } .print-table { width: 100%; border-collapse: collapse; } .print-table th, .print-table td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 12px; } .print-table th { background: #f5f5f5; } .print-table tfoot td { font-weight: bold; background: #f5f5f5; } @media print { body { padding: 0; } }</style></head><body>${printContent}</body></html>`)
  printWindow.document.close()
  printWindow.print()
}

// 返回
const handleBack = () => router.push('/production')

// 加载详情
const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await productionApi.getDetail(orderId)
    order.value = res.data
    measureFaces.value = (res.data.measureFaces || []).map(f => ({ ...f, selected: false }))
    checkForm.remark = ''
    try { const logRes = await orderApi.getLogs(orderId); logs.value = logRes.data || [] } catch (e) { logs.value = [] }
  } catch (err) { ElMessage.error('获取详情失败') }
  finally { loading.value = false }
}

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.production-detail-page {
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
  width: calc((100% - 80px) * 0.58);
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
  font-size: 11px;
  font-weight: 500;
  background: var(--brand-primary-light);
  color: var(--brand-primary);
  padding: 2px 8px;
  border-radius: 99px;
}
.card-body { padding: 16px 20px; }

/* ===== 设计方案 + 进度 双栏 ===== */
.dual-row {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
}

/* 设计方案 */
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

/* 进度统计 */
.progress-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.stat-box {
  text-align: center;
  padding: 12px;
  background: var(--bg-page, #f1f5f9);
  border-radius: var(--radius-md);
}
.stat-box .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.stat-box .stat-label { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.stat-box.highlight .stat-value { color: var(--brand-primary); }
.stat-box.success .stat-value { color: #10b981; }
.stat-box.warning .stat-value { color: #f59e0b; }

.progress-bar-container { margin-top: 8px; }
.progress-bar {
  height: 10px;
  background: var(--bg-page, #f1f5f9);
  border-radius: 99px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--brand-primary), #10b981);
  transition: width 0.6s ease;
}
.progress-text {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.progress-text strong { color: var(--text-primary); }

/* ===== 物料清单 - 按广告类型分组 ===== */
.material-card { }
.toolbar-right { display: flex; gap: 8px; align-items: center; margin-left: auto; }

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

.ad-type-status {
  margin-left: auto;
  display: flex;
  gap: 8px;
  align-items: center;
}
.ad-type-progress {
  width: 80px;
  height: 6px;
  background: var(--bg-page, #f1f5f9);
  border-radius: 99px;
  overflow: hidden;
}
.ad-type-progress-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--brand-primary);
  transition: width 0.4s ease;
}
.ad-type-progress-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}
.ad-type-collapse {
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
}
.thumb-img:hover { box-shadow: var(--shadow-md); }
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
.expand-photos {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
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

.expand-remark {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
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

/* 打印 */
.print-area { position: absolute; left: -9999px; top: -9999px; }

/* 响应式 */
@media (max-width: 1100px) {
  .dual-row { grid-template-columns: 1fr; }
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
