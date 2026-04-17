<template>
  <div v-loading="loading">
    <!-- 加载失败提示 -->
    <el-result v-if="loadError" icon="warning" title="加载失败" :sub-title="loadError">
      <template #extra>
        <el-button type="primary" @click="loadData">重新加载</el-button>
        <el-button @click="$router.push('/audit')">返回审核中心</el-button>
      </template>
    </el-result>

    <template v-if="!loadError">
    <div class="page-header flex-between">
      <div class="header-left">
        <el-button link @click="$router.back()" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>返回审核中心
        </el-button>
        <h1 class="page-title">审核详情</h1>
      </div>
      <div class="page-actions" v-if="auditType">
        <el-button type="success" @click="handleApprove" :loading="submitting">
          <el-icon><Check /></el-icon>审核通过
        </el-button>
        <el-button type="danger" @click="openRejectDialog">
          <el-icon><Close /></el-icon>驳回
        </el-button>
      </div>
    </div>

    <template v-if="data">
      <!-- 基本信息 -->
      <el-card class="mb-16">
        <template #header>
          <span class="card-title">基本信息</span>
        </template>
        <el-descriptions :column="4" border>
          <el-descriptions-item label="工单号">{{ data.work_order_no }}</el-descriptions-item>
          <el-descriptions-item label="店铺名">{{ data.title }}</el-descriptions-item>
          <el-descriptions-item label="元素">{{ data.project_type || '—' }}</el-descriptions-item>
          <el-descriptions-item label="当前环节">{{ stageLabel(data.current_stage) }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ data.assigned_to || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ data.deadline || '—' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 测量审核详情 -->
      <template v-if="auditType === 'measurement'">
        <el-card v-if="measurementData" class="mb-16">
          <template #header>
            <span class="card-title">测量数据</span>
            <el-tag size="small" type="success" style="margin-left:8px">测量员: {{ measurementData.measurer_name || '—' }}</el-tag>
          </template>
          <div v-for="mat in groupedMaterials" :key="mat.type" class="material-block">
            <div class="material-header">
              <span class="material-name">{{ materialTypeLabel(mat.type) }}</span>
              <span class="material-area">合计: {{ mat.totalArea.toFixed(2) }}m²</span>
            </div>
            <table class="face-table">
              <thead>
                <tr><th>面</th><th>宽(cm)</th><th>高(cm)</th><th>面积(m²)</th><th>照片</th></tr>
              </thead>
              <tbody>
                <template v-for="g in mat.groupedFaces" :key="g.key">
                  <tr v-for="(face, idx) in g.faces" :key="face.label + '-' + idx"
                    :class="{ 'unified-row': g.isUnified }">
                    <td class="unified-cell" :class="{ 'is-unified': g.isUnified }">
                      <span v-if="g.isUnified && idx === 0" class="unified-tag">一体</span>
                      {{ face.label }}
                    </td>
                    <td>{{ face.width }}</td>
                    <td>{{ face.height }}</td>
                    <td class="area-cell">{{ face.area.toFixed(2) }}</td>
                    <td>
                      <el-image v-if="face.photos?.length"
                        :src="getFullUrl(face.photos[0])"
                        :preview-src-list="face.photos.map(getFullUrl)"
                        fit="cover"
                        class="face-photo-thumb"
                      />
                      <span v-else class="text-muted">—</span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <el-empty v-if="!groupedMaterials.length" description="暂无测量数据" />
        </el-card>
      </template>

      <!-- 设计审核详情 -->
      <template v-if="auditType === 'design'">
        <el-card v-if="designData" class="mb-16">
          <template #header>
            <div class="flex-between">
              <div>
                <span class="card-title">设计稿</span>
                <el-tag size="small" style="margin-left:8px">设计师: {{ designData.designer_name || '—' }}</el-tag>
                <el-tag size="small" type="info" style="margin-left:4px">v{{ designData.version }}</el-tag>
              </div>
              <el-button type="primary" size="small" @click="printPreview">
                <el-icon><Printer /></el-icon> 打印预览
              </el-button>
            </div>
          </template>
          <!-- PDF 文件下载 -->
          <div v-if="designPdfs.length" class="pdf-section">
            <h4 class="section-label">设计文件</h4>
            <div class="pdf-list">
              <a v-for="(pdf, i) in designPdfs" :key="i" :href="pdf.url" target="_blank" class="pdf-link">
                <el-icon><Document /></el-icon>
                <span>{{ pdf.name }}</span>
                <el-button size="small" type="primary" link>下载</el-button>
              </a>
            </div>
          </div>
          <!-- 照片对比：现场照片 vs 设计效果图 -->
          <div v-if="sitePhotos.length || designImages.length" class="compare-section">
            <h4 class="section-label">现场照片 vs 设计效果图</h4>
            <div class="compare-grid">
              <!-- 现场照片列 -->
              <div class="compare-column">
                <div class="column-header">
                  <el-tag type="warning" effect="plain" size="small">现场照片</el-tag>
                  <span class="column-count">{{ sitePhotos.length }}张</span>
                </div>
                <div class="column-body">
                  <el-image
                    v-for="(url, i) in sitePhotos"
                    :key="'site' + i"
                    :src="url"
                    :preview-src-list="sitePhotos"
                    :initial-index="i"
                    fit="cover"
                    class="compare-image"
                  />
                  <el-empty v-if="!sitePhotos.length" description="无现场照片" :image-size="40" />
                </div>
              </div>
              <!-- 设计效果图列 -->
              <div class="compare-column">
                <div class="column-header">
                  <el-tag type="success" effect="plain" size="small">设计效果图</el-tag>
                  <span class="column-count">{{ designImages.length }}张</span>
                </div>
                <div class="column-body">
                  <el-image
                    v-for="(url, i) in designImages"
                    :key="'design' + i"
                    :src="url"
                    :preview-src-list="designImages"
                    :initial-index="i"
                    fit="cover"
                    class="compare-image"
                  />
                  <el-empty v-if="!designImages.length" description="无效果图" :image-size="40" />
                </div>
              </div>
            </div>
          </div>
          <!-- 测量数据参考 -->
          <div v-if="measureRef.length" class="ref-section">
            <h4 class="section-label">测量数据（参考）</h4>
            <div v-for="mat in designGroupedMaterials" :key="mat.type" class="material-block">
              <div class="material-header">
                <span>{{ materialTypeLabel(mat.type) }}</span>
                <span>{{ mat.totalArea.toFixed(2) }}m²</span>
              </div>
              <table class="face-table">
                <thead><tr><th>面</th><th>宽(cm)</th><th>高(cm)</th><th>面积(m²)</th></tr></thead>
                <tbody>
                  <template v-for="g in mat.groupedFaces" :key="g.key">
                    <tr v-for="(face, idx) in g.faces" :key="face.label + '-' + idx"
                      :class="{ 'unified-row': g.isUnified }">
                      <td class="unified-cell" :class="{ 'is-unified': g.isUnified }">
                        <span v-if="g.isUnified && idx === 0" class="unified-tag">一体</span>
                        {{ face.label }}
                      </td>
                      <td>{{ Number(face.width||0).toFixed(2) }}</td>
                      <td>{{ Number(face.height||0).toFixed(2) }}</td>
                      <td class="area-cell">{{ face.area.toFixed(2) }}</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
          <!-- 甲方照片 -->
          <div v-if="declarationPhotos.length" class="ref-section">
            <h4 class="section-label">甲方上传照片</h4>
            <div class="photo-grid">
              <el-image
                v-for="(url, i) in declarationPhotos"
                :key="'decl' + i"
                :src="url"
                :preview-src-list="declarationPhotos"
                :initial-index="i"
                fit="cover"
                class="photo-thumb"
              />
            </div>
          </div>
        </el-card>
      </template>

      <!-- 施工验收详情 -->
      <template v-if="auditType === 'construction'">
        <el-card v-if="constructionData" class="mb-16">
          <template #header>
            <span class="card-title">施工信息</span>
            <el-tag size="small" type="warning" style="margin-left:8px">施工员: {{ constructionData.constructor_name || '—' }}</el-tag>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="开工日期">{{ constructionData.started_at || '—' }}</el-descriptions-item>
            <el-descriptions-item label="完工日期">{{ constructionData.constructed_at || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工时长">{{ constructionData.duration_minutes ? constructionData.duration_minutes + '分钟' : '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工备注" :span="3">{{ constructionData.notes || '—' }}</el-descriptions-item>
          </el-descriptions>
          <!-- 完工照片 -->
          <div v-if="constructionPhotos.length" class="photo-section">
            <h4 class="section-label">完工照片</h4>
            <div class="photo-grid">
              <el-image
                v-for="(url, i) in constructionPhotos"
                :key="'const' + i"
                :src="url"
                :preview-src-list="constructionPhotos"
                :initial-index="i"
                fit="cover"
                class="photo-thumb"
              />
            </div>
          </div>
        </el-card>
      </template>

      <!-- 操作日志 -->
      <el-card>
        <template #header><span class="card-title">操作日志</span></template>
        <el-timeline>
          <el-timeline-item
            v-for="log in logs"
            :key="log.id"
            :timestamp="log.created_at?.slice(0, 19) || ''"
            placement="top"
          >
            <span>{{ log.detail }}</span>
            <span v-if="log.user_name" class="log-user"> — {{ log.user_name }}</span>
          </el-timeline-item>
          <el-empty v-if="!logs.length" description="暂无操作日志" :image-size="60" />
        </el-timeline>
      </el-card>
    </template>
    </template>

    <!-- 驳回对话框 -->
    <el-dialog v-model="showRejectDialog" :title="`驳回 - ${data?.work_order_no} ${data?.title}`" width="480px">
      <el-form>
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectReason" type="textarea" :rows="4" placeholder="请详细说明驳回原因及修改要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="submitting">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 打印预览对话框 -->
    <el-dialog v-model="showPrintDialog" title="打印预览" width="720px" top="5vh" class="print-dialog">
      <div class="print-preview-content" id="printArea">
        <!-- 基本信息区 -->
        <div class="print-header">
          <h2>设计审核单</h2>
          <div class="print-info">
            <div class="info-row"><span class="label">工单号:</span><span>{{ data?.work_order_no }}</span></div>
            <div class="info-row"><span class="label">店铺名:</span><span>{{ data?.title }}</span></div>
            <div class="info-row"><span class="label">元素:</span><span>{{ data?.project_type || '—' }}</span></div>
            <div class="info-row"><span class="label">设计师:</span><span>{{ designData?.designer_name || '—' }}</span></div>
            <div class="info-row"><span class="label">版本:</span><span>v{{ designData?.version }}</span></div>
            <div class="info-row"><span class="label">日期:</span><span>{{ new Date().toLocaleDateString() }}</span></div>
          </div>
        </div>
        <!-- 设计图区域 -->
        <div class="print-designs">
          <h3>设计效果图</h3>
          <div class="design-images-print">
            <div v-for="(item, i) in designImagesWithInfo" :key="i" class="design-image-item" :class="{ 'full-width': designImages.length === 1, 'half-width': designImages.length === 2 }">
              <div class="image-info-tag">{{ item.faceLabel || item.materialName }} {{ item.size }}</div>
              <img :src="item.url" :alt="(item.faceLabel || item.materialName) + ' ' + item.size" />
            </div>
          </div>
        </div>
        <!-- 签字区 -->
        <div class="print-signature">
          <div class="signature-item">
            <span>设计师签字:</span>
            <div class="signature-line"></div>
          </div>
          <div class="signature-item">
            <span>审核人签字:</span>
            <div class="signature-line"></div>
          </div>
          <div class="signature-item">
            <span>日期:</span>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPrintDialog = false">关闭</el-button>
        <el-button type="primary" @click="doPrint">
          <el-icon><Printer /></el-icon> 打印
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Close, Document, Printer } from '@element-plus/icons-vue'
import api from '../api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const loadError = ref(null)
const data = ref(null)
const auditType = ref('')
const showRejectDialog = ref(false)
const rejectReason = ref('')
const logs = ref([])
const showPrintDialog = ref(false)

// Detail data
const measurementData = ref(null)
const designData = ref(null)
const constructionData = ref(null)
const measureRef = ref([])
const designImages = ref([])
const declarationPhotos = ref([])
const constructionPhotos = ref([])
const sitePhotos = ref([]) // 现场照片（从测量数据提取）
const designPdfs = ref([]) // 设计 PDF 文件

const STAGE_MAP = {
  declaration: '申报接收', approval: '待审批', assignment: '待派单',
  measurement: '测量中', design: '设计中', production: '生产中',
  construction: '施工中', finance: '费用管理', archive: '已归档', aftersale: '售后',
}
function stageLabel(s) { return STAGE_MAP[s] || s }

const adTypeMap = ref({})

async function loadSettings() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    const templates = settings.project_templates || []
    for (const tmpl of templates) {
      for (const adType of (tmpl.ad_types || [])) {
        if (adType.key && adType.label) adTypeMap.value[adType.key] = adType.label
      }
    }
  } catch {}
}

function materialTypeLabel(v) {
  if (!v) return '未分类'
  return adTypeMap.value[v] || v
}

function groupMaterials(materials) {
  const map = {}
  for (const m of materials) {
    let mats = m.materials || []
    if (typeof mats === 'string') { try { mats = JSON.parse(mats) } catch { mats = [] } }
    if (!Array.isArray(mats)) continue
    for (const mat of mats) {
      const type = mat.material_type || mat.type || '未分类'
      if (!map[type]) map[type] = { type, faces: [], totalArea: 0 }
      for (const face of (mat.faces || [])) {
        let w = face.width || face._widthM || 0
        let h = face.height || face._heightM || 0
        const storedArea = face.area || 0
        // w/h 单位是 cm，如果没有存储的面积，需要 /10000 转成 m²
        const area = storedArea > 0 ? storedArea : (w * h) / 10000
        map[type].faces.push({
          label: face.label || '未知面',
          width: w,
          height: h,
          area,
          photos: face.photos || [],
          isUnified: face.is_unified || face.isUnified || false,
          groupName: face.group_name || face.groupName || '',
        })
        map[type].totalArea += area
      }
    }
  }
  // 按 group_name 分组，一体组合放一起
  for (const type of Object.values(map)) {
    const groups = {}
    const ungrouped = []
    for (const face of type.faces) {
      if (face.isUnified && face.groupName) {
        if (!groups[face.groupName]) groups[face.groupName] = { key: 'u_' + face.groupName, groupName: face.groupName, isUnified: true, faces: [] }
        groups[face.groupName].faces.push(face)
      } else {
        ungrouped.push(face)
      }
    }
    type.groupedFaces = [...Object.values(groups), ...ungrouped.map(f => ({ key: f.label, groupName: '', isUnified: false, faces: [f] }))]
  }
  return Object.values(map)
}

const groupedMaterials = computed(() => groupMaterials(measurementData.value ? [measurementData.value] : []))

const designGroupedMaterials = computed(() => groupMaterials(measureRef.value))

// 设计图片带尺寸和材料信息
const designImagesWithInfo = computed(() => {
  const result = []
  const mapping = designData.value?.face_mapping || []
  // 获取原始测量数据
  let rawMaterials = measurementData.value?.materials || []
  if (typeof rawMaterials === 'string') {
    try { rawMaterials = JSON.parse(rawMaterials) } catch { rawMaterials = [] }
  }

  // 从face_mapping提取图片与面的对应关系
  const imageToInfo = new Map()
  for (const item of mapping) {
    const imgUrl = getFullUrl(item.image_url)
    if (!imgUrl) continue

    const info = imageToInfo.get(imgUrl) || {
      faces: [],
      materialTypes: new Set(),
      groupIndex: item.group_index
    }

    // 一体组合：face_labels 是数组
    if (item.face_labels && Array.isArray(item.face_labels)) {
      info.faces = item.face_labels
      info.isUnified = true
    } else if (item.face_label) {
      info.faces.push(item.face_label)
    }

    if (item.material_type) info.materialTypes.add(materialTypeLabel(item.material_type))
    imageToInfo.set(imgUrl, info)
  }

  // 辅助函数：从原始测量数据查找面的尺寸
  const findFaceSize = (materialType, faceLabel) => {
    for (const mat of rawMaterials) {
      if (!Array.isArray(mat.faces)) continue
      for (const face of mat.faces) {
        if (face.label === faceLabel) {
          return { width: face.width, height: face.height }
        }
      }
    }
    return null
  }

  // 为每张设计图添加信息
  for (const url of designImages.value) {
    const info = imageToInfo.get(url)
    let sizeText = ''
    let faceLabel = ''

    if (info?.faces.length) {
      // 构建面标签文本
      if (info.isUnified && info.faces.length > 1) {
        faceLabel = info.faces.join('+') + ' 一体'
        // 一体组合：找出最大宽度和高度
        let maxW = 0, maxH = 0
        for (const f of info.faces) {
          const size = findFaceSize(info.materialTypes.values().next().value, f)
          if (size) {
            maxW = Math.max(maxW, size.width || 0)
            maxH = Math.max(maxH, size.height || 0)
          }
        }
        if (maxW && maxH) {
          sizeText = `${maxW}×${maxH}cm`
        }
      } else {
        // 单面：直接获取尺寸
        faceLabel = info.faces[0]
        const mats = Array.from(info.materialTypes)
        for (const matType of mats) {
          const size = findFaceSize(matType, faceLabel)
          if (size) {
            sizeText = `${size.width}×${size.height}cm`
            break
          }
        }
      }
    }

    result.push({
      url,
      materialName: info?.materialTypes.size ? Array.from(info.materialTypes).join('/') : '',
      size: sizeText,
      faces: info?.faces || [],
      faceLabel // 新增：面的标签（一体面显示如"门头+侧面 一体"）
    })
  }

  return result
})

function getFullUrl(u) {
  if (!u) return ''
  if (u.startsWith('http')) return u
  const origin = window.location.origin
  return u.startsWith('/') ? origin + u : origin + '/' + u
}

async function loadData() {
  loading.value = true
  loadError.value = null
  const id = route.params.id
  try {
    // 并行获取工单详情、申报信息、日志、设置
    const [woRes, declRes, logRes] = await Promise.all([
      api.get(`/work-orders/${id}`),
      api.get(`/tenant/declarations/${id}`).catch(() => ({})),
      api.get(`/work-orders/${id}/logs`).catch(() => ({})),
      loadSettings(),
    ])
    data.value = woRes.data || woRes
    auditType.value = determineAuditType(data.value)
    declarationPhotos.value = ((declRes.data || {}).photos || []).map(u => getFullUrl(u))
    logs.value = logRes.data?.list || logRes.data || []

    // 根据审核类型获取相关数据
    const type = auditType.value

    if (type === 'measurement' || type === 'design') {
      // 测量数据优先从工单详情获取
      let m = data.value.measurements?.[0] || data.value.measurement
      if (!m) {
        // 如果工单详情没有，再调用测量 API
        try {
          const mRes = await api.get(`/measurements/tasks/${id}`)
          m = mRes.data?.measurements?.[0] || mRes.data
        } catch {}
      }
      if (m) {
        measurementData.value = m
        if (m.measurer_id || m.measurer_name) {
          measurementData.value.measurer_name = m.measurer_name || ''
        }
      }
    }

    if (type === 'design') {
      // 设计数据优先从工单详情获取
      let d = data.value.designs?.[0] || data.value.design
      if (d) {
        designData.value = d
        designImages.value = ((d.effect_images || [])).map(u => getFullUrl(u))
        // 提取 PDF 文件
        const files = d.source_files || []
        designPdfs.value = files.filter(f => {
          const url = f?.url || f || ''
          return url.toLowerCase().endsWith('.pdf')
        }).map(f => ({
          name: f?.name || (typeof f === 'string' ? f.split('/').pop() : '设计文件.pdf'),
          url: getFullUrl(f?.url || f)
        }))
        designData.value.designer_name = d.designer_name || ''
      }
      // 提取现场照片
      if (measurementData.value) {
        measureRef.value = [measurementData.value]
        try {
          let mats = measurementData.value.materials || []
          if (typeof mats === 'string') mats = JSON.parse(mats)
          if (Array.isArray(mats)) {
            const photoSet = new Set()
            for (const mat of mats) {
              for (const face of (mat.faces || [])) {
                for (const p of (face.photos || [])) {
                  const url = getFullUrl(p)
                  if (url) photoSet.add(url)
                }
              }
            }
            sitePhotos.value = Array.from(photoSet)
          }
        } catch { sitePhotos.value = [] }
      }
    }

    if (type === 'construction') {
      // 施工数据从工单详情获取
      const c = data.value.constructions?.[0] || data.value.construction
      if (c) {
        constructionData.value = c
        constructionPhotos.value = ((c.after_photos || c.completed_photos || [])).map(u => getFullUrl(u))
        constructionData.value.constructor_name = c.constructor_name || ''
      }
    }
  } catch (e) {
    const errorMsg = e.response?.data?.error || e.message || '加载失败'
    loadError.value = errorMsg
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

function determineAuditType(wo) {
  if (!wo) return ''
  const stage = wo.current_stage
  if (stage === 'measurement') return 'measurement'
  if (stage === 'design') return 'design'
  if (stage === 'construction') return 'construction'
  // Fallback: check if there's a pending review
  if (wo.measurement?.status === 'measured') return 'measurement'
  return 'design'
}

async function handleApprove() {
  submitting.value = true
  try {
    if (auditType.value === 'measurement') {
      await api.post(`/measurements/${route.params.id}/review`, { action: 'approve' })
    } else if (auditType.value === 'design') {
      await api.post(`/designs/${route.params.id}/review`, { action: 'approve' })
    } else if (auditType.value === 'construction') {
      await api.post(`/construction/${route.params.id}/internal-verify`, { verified: true, notes: '' })
    }
    ElMessage.success('审核通过')
    router.push('/audit')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

function openRejectDialog() {
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) return ElMessage.warning('请填写驳回原因')
  submitting.value = true
  try {
    if (auditType.value === 'measurement') {
      await api.post(`/measurements/${route.params.id}/review`, {
        action: 'reject', reason: rejectReason.value.trim(),
      })
    } else if (auditType.value === 'design') {
      await api.post(`/designs/${route.params.id}/review`, {
        action: 'reject', comment: rejectReason.value.trim(),
      })
    } else if (auditType.value === 'construction') {
      await api.post(`/construction/${route.params.id}/internal-verify`, {
        verified: false, notes: rejectReason.value.trim(),
      })
    }
    ElMessage.success('已驳回')
    router.push('/audit')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

function printPreview() {
  showPrintDialog.value = true
}

function doPrint() {
  const printContent = document.getElementById('printArea')
  if (!printContent) return
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
    <head>
      <title>打印 - ${data.value?.work_order_no || '设计审核单'}</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; margin: 0; }
        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .print-header h2 { margin: 0 0 15px 0; font-size: 20px; }
        .print-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: left; }
        .info-row { font-size: 13px; }
        .info-row .label { color: #666; margin-right: 8px; }
        .print-designs { margin: 20px 0; }
        .print-designs h3 { font-size: 14px; margin-bottom: 12px; border-left: 3px solid #2563eb; padding-left: 8px; }
        .design-images-print { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .design-image-item { text-align: center; max-width: 600px; page-break-inside: avoid; }
        .design-image-item.full-width { grid-column: 1 / -1; max-width: 600px; margin: 0 auto; }
        .design-image-item img { width: 100%; max-width: 600px; max-height: 700px; height: auto; object-fit: contain; border: 1px solid #ddd; background: #fafafa; }
        .image-no { margin-top: 4px; font-size: 12px; color: #666; }
        .print-signature { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #eee; }
        .signature-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .signature-line { width: 120px; border-bottom: 1px solid #333; height: 1px; }
        @media print { .design-image-item { page-break-inside: avoid; } }
      </style>
    </head>
    <body>${printContent.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.page-header { margin-bottom: var(--space-6); }
.header-left { display: flex; align-items: center; gap: var(--space-3); }
.back-btn { font-size: 13px; color: var(--color-text-secondary); }
.back-btn:hover { color: var(--color-primary); }
.page-actions { display: flex; gap: var(--space-2); }
.mb-16 { margin-bottom: var(--space-4); }
.card-title { font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); }
.log-user { color: var(--color-text-secondary); font-size: 12px; }

/* Material tables */
.material-block { margin-bottom: 16px; border: 1px solid var(--color-border-light); border-radius: 8px; overflow: hidden; }
.material-header {
  display: flex; justify-content: space-between;
  font-size: 13px; font-weight: 700;
  padding: 8px 12px; background: #f5f7fa;
}
.material-name { color: #374151; }
.material-area { color: var(--color-primary); font-weight: 700; }
.face-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.face-table th, .face-table td { padding: 6px 12px; border-top: 1px solid #f0f0f0; text-align: left; }
.face-table th { background: #fafafa; font-weight: 600; color: #6b7280; }
.area-cell { color: var(--color-primary); font-weight: 600; text-align: right; }

/* Photos */
.photo-section, .design-section, .ref-section { margin-top: 16px; }
.section-label { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--color-text-secondary); }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
.photo-thumb { width: 100%; height: 80px; border-radius: 6px; cursor: pointer; border: 1px solid #e5e7eb; }
.face-photo-thumb { width: 48px; height: 48px; border-radius: 4px; cursor: pointer; border: 1px solid #e5e7eb; }

.design-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.design-image { width: 100%; height: 180px; border-radius: 8px; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

/* PDF section */
.pdf-section { margin-bottom: 16px; }
.pdf-list { display: flex; flex-direction: column; gap: 8px; }
.pdf-link {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #f5f7fa; border-radius: 6px;
  color: var(--color-text-primary); font-size: 13px;
  transition: all 0.2s;
}
.pdf-link:hover { background: #e6f7ff; color: var(--color-primary); }
.pdf-link .el-icon { color: var(--color-primary); }

/* Compare section */
.compare-section { margin-top: 16px; border: 1px solid var(--color-border-light); border-radius: 8px; padding: 16px; }
.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.compare-column { background: #fafafa; border-radius: 6px; padding: 12px; }
.column-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.column-count { font-size: 12px; color: var(--color-text-secondary); }
.column-body { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; min-height: 100px; }
.compare-image { width: 100%; height: 120px; border-radius: 6px; cursor: pointer; border: 1px solid #e5e7eb; }

/* Print preview styles */
.print-preview-content { padding: 20px; background: #fff; }
.print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
.print-header h2 { margin: 0 0 15px 0; font-size: 20px; }
.print-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: left; }
.info-row { font-size: 13px; }
.info-row .label { color: #666; margin-right: 8px; }
.print-designs { margin: 20px 0; }
.print-designs h3 { font-size: 14px; margin-bottom: 12px; border-left: 3px solid var(--color-primary); padding-left: 8px; }
.design-images-print { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.design-image-item { text-align: center; max-width: 600px; position: relative; }
.design-image-item.full-width { grid-column: 1 / -1; max-width: 600px; margin: 0 auto; }
.design-image-item.half-width { max-width: 100%; }
.design-image-item img { width: 100%; max-width: 600px; max-height: 700px; height: auto; object-fit: contain; border: 1px solid #ddd; background: #fafafa; }
.image-info-tag {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 0 0 4px 0;
  z-index: 10;
}
.print-signature { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #eee; }
.signature-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.signature-line { width: 120px; border-bottom: 1px solid #333; height: 1px; }

/* 一体标识 */
.unified-cell { position: relative; }
.unified-cell.is-unified { padding-top: 14px; }
.unified-tag {
  position: absolute;
  top: 2px;
  left: 2px;
  background: var(--color-warning);
  color: #fff;
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
}
</style>
