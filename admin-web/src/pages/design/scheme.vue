<template>
  <div class="design-detail" v-loading="loading">
    <!-- 顶部导航 -->
    <div class="top-bar">
      <el-button text @click="handleBack" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
      <div class="order-header">
        <span class="order-no">{{ order?.order_no }}</span>
        <span class="status-badge" :class="getStatusBadgeClass(order?.status)">
          <span class="status-dot"></span>
          {{ getStatusText(order?.status) }}
        </span>
      </div>
      <div class="top-actions">
        <el-button v-if="canEdit && hasUnsavedChanges" class="btn-success" :loading="submitting" @click="handleSubmit">
          <el-icon><Check /></el-icon>
          提交方案
        </el-button>
        <el-button v-if="order?.status === 'designing' && canManage" @click="handleDispatch">
          派单
        </el-button>
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
            <h4>订单信息</h4>
          </div>
          <div class="info-card-body">
            <div class="info-row"><span class="info-label">编号</span><span class="info-value mono">{{ order?.order_no }}</span></div>
            <div class="info-row"><span class="info-label">店面</span><span class="info-value">{{ order?.title || order?.form_data?.company }}</span></div>
            <div class="info-row"><span class="info-label">客户</span><span class="info-value">{{ order?.customer?.real_name || '-' }}</span></div>
            <div class="info-row"><span class="info-label">电话</span><span class="info-value mono">{{ order?.customer?.phone || '-' }}</span></div>
            <div class="info-row"><span class="info-label">创建时间</span><span class="info-value mono">{{ formatDate(order?.created_at) }}</span></div>
            <div class="info-row"><span class="info-label">设计师</span><span class="info-value">{{ order?.handler?.real_name || '未指派' }}</span></div>
          </div>
        </div>

        <!-- 测量信息 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><Location /></el-icon>
            <h4>测量信息</h4>
          </div>
          <div class="info-card-body">
            <div class="info-row"><span class="info-label">地址</span><span class="info-value">{{ order?.form_data?.address || '-' }}</span></div>
            <div class="info-row"><span class="info-label">测量员</span><span class="info-value">{{ order?.measureHandler?.real_name || '-' }}</span></div>
            <div class="info-row"><span class="info-label">测量时间</span><span class="info-value mono">{{ formatDate(order?.measureTime) }}</span></div>
            <div class="info-row"><span class="info-label">备注</span><span class="info-value">{{ order?.measureRemark || '无' }}</span></div>
          </div>
        </div>

        <!-- 类型统计 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><DataLine /></el-icon>
            <h4>类型统计</h4>
          </div>
          <div class="info-card-body">
            <div class="type-stats">
              <div v-for="(count, name) in typeStats" :key="name" class="type-stat">
                <div class="type-stat-value">{{ count }}</div>
                <div class="type-stat-label">{{ name }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 方案备注 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><EditPen /></el-icon>
            <h4>方案备注</h4>
          </div>
          <div class="info-card-body">
            <el-input
              v-if="canEdit"
              v-model="schemeForm.remark"
              type="textarea"
              :rows="3"
              class="remark-box"
              placeholder="填写方案备注..."
              @change="hasUnsavedChanges = true"
            />
            <p v-else class="remark-display">{{ schemeForm.remark || '暂无备注' }}</p>
          </div>
        </div>

        <!-- CDR源文件 -->
        <div class="info-card">
          <div class="info-card-header">
            <el-icon><Files /></el-icon>
            <h4>CDR源文件</h4>
          </div>
          <div class="info-card-body">
            <div v-if="schemeForm.cdrFile" class="cdr-file">
              <div class="cdr-icon">CDR</div>
              <span class="cdr-name">{{ cdrFile?.originalname || 'CDR文件' }}</span>
              <el-button v-if="canEdit" text size="small" @click="removeCdrFile">删除</el-button>
            </div>
            <el-button v-else-if="canEdit" :loading="cdrUploading" @click="triggerCdrUpload" style="width: 100%">
              上传CDR文件
            </el-button>
            <span v-else class="no-cdr">暂无CDR文件</span>
          </div>
        </div>
      </div>

      <!-- 右侧设计区 -->
      <div class="design-area">
        <!-- 类型分组 -->
        <div class="type-list" v-loading="loading">
          <div v-for="(faces, typeName) in typeGroupsData" :key="typeName" class="type-group">
            <div class="type-header" @click="toggleType(typeName)">
              <div class="type-header-left">
                <el-icon class="type-chevron" :class="{ open: isTypeExpanded(typeName) }"><ArrowRight /></el-icon>
                <span class="type-name">{{ typeName || '未分类' }}</span>
              </div>
              <div class="type-header-right">
                <span class="type-badge">{{ getUngroupedFaces(typeName).length }} 面</span>
                <span v-if="getTypeGroups(typeName).length" class="type-badge">{{ getTypeGroups(typeName).length }} 组</span>
                <span class="type-area">{{ calculateTypeArea(typeName) }} m²</span>
              </div>
            </div>
            <div v-show="isTypeExpanded(typeName)" class="type-body">
              <div class="type-content">
                <!-- 设计资料 -->
                <div class="design-data-sidebar" v-if="getTypeDesignData(typeName).length">
                  <div class="data-header">设计资料</div>
                  <div class="data-items">
                    <div v-for="(item, idx) in getTypeDesignData(typeName)" :key="idx" class="data-item" @click="copyText(item.name)">
                      <span class="data-name">{{ item.name }}</span>
                      <span class="data-face">{{ item.faceName }}</span>
                    </div>
                  </div>
                </div>

                <!-- 面卡片网格 -->
                <div class="faces-grid">
                <!-- 合并组 -->
                <div
                  v-for="(g, gIndex) in getTypeGroups(typeName)"
                  :key="'group-'+gIndex"
                  class="face-card merged"
                  :class="{ selected: isGroupSelected(g), disabled: !canSelectFace(g.faceIds[0]) }"
                  @click="canEdit && canSelectFace(g.faceIds[0]) && toggleGroupSelection(g)"
                >
                  <div class="face-card-header">
                    <el-checkbox v-if="canEdit" :model-value="isGroupSelected(g)" :disabled="!canSelectFace(g.faceIds[0])" @click.stop="toggleGroupSelection(g)" />
                    <span class="face-card-name">{{ g.faceIds.map(id => getFaceName(id)).join(' + ') }}</span>
                    <span class="face-card-size">{{ getGroupSize(g) }}</span>
                    <el-button v-if="canEdit" text size="small" @click.stop="removeGroup(g)" title="拆分">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                  <div class="face-card-body">
                    <div class="photo-compare">
                      <div class="photo-slot">
                        <div v-if="g.faceIds.length > 1" style="display:flex;gap:4px;height:100%">
                          <img
                            v-for="faceId in g.faceIds"
                            :key="faceId"
                            class="photo-img"
                            style="flex:1"
                            :src="getFacePhotos(faceId)[0] || ''"
                            :alt="getFaceName(faceId)"
                            v-if="getFacePhotos(faceId).length"
                          >
                          <div v-else class="photo-placeholder">{{ g.faceIds.map(id => getFaceName(id)).join(' + ') }}</div>
                        </div>
                        <el-image
                          v-else-if="getFacePhotos(g.faceIds[0]).length"
                          :src="getFacePhotos(g.faceIds[0])[0]"
                          :preview-src-list="getFacePhotos(g.faceIds[0])"
                          :preview-teleported="true"
                          fit="cover"
                          class="photo-img"
                        />
                        <div v-else class="photo-placeholder">{{ getFaceName(g.faceIds[0]).slice(0, 4) }}</div>
                        <span class="photo-slot-label measure">测量图</span>
                      </div>
                      <div class="photo-slot">
                        <el-image
                          v-if="g.image"
                          :src="g.image"
                          :preview-src-list="[g.image]"
                          :preview-teleported="true"
                          fit="cover"
                          class="photo-img"
                        />
                        <div v-else-if="canEdit" class="photo-placeholder upload-placeholder" @click.stop="triggerGroupUpload(g)">
                          <el-icon><Plus /></el-icon>
                          上传设计图
                        </div>
                        <div v-else class="photo-placeholder">设计图</div>
                        <span class="photo-slot-label design">设计图</span>
                      </div>
                    </div>
                    <div v-if="getGroupRemarks(g).length" class="remarks-list">
                      <div v-for="(item, idx) in getGroupRemarks(g)" :key="idx" class="face-remark">
                        <span class="face-remark-label">{{ item.faceName }}</span>
                        <span class="face-remark-text">{{ item.remark }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 单独的面 -->
                <div
                  v-for="face in getUngroupedFaces(typeName)"
                  :key="face.id"
                  class="face-card"
                  :class="{ selected: faceSelections[face.id], disabled: !canSelectFace(face.id) }"
                  @click="canEdit && canSelectFace(face.id) && toggleFaceSelection(face.id)"
                >
                  <div class="face-card-header">
                    <el-checkbox v-if="canEdit" v-model="faceSelections[face.id]" :disabled="!canSelectFace(face.id)" @click.stop />
                    <span class="face-card-name">{{ face.face_name }}</span>
                    <span class="face-card-size">{{ face.width }}×{{ face.height }}cm</span>
                  </div>
                  <div class="face-card-body">
                    <div class="photo-compare">
                      <div class="photo-slot">
                        <el-image
                          v-if="face.photos?.length"
                          :src="face.photos[0]"
                          :preview-src-list="face.photos"
                          :preview-teleported="true"
                          fit="cover"
                          class="photo-img"
                        />
                        <div v-else class="photo-placeholder">测量图</div>
                        <span class="photo-slot-label measure">测量图</span>
                      </div>
                      <div class="photo-slot">
                        <el-image
                          v-if="schemeForm.designs[face.id]?.image"
                          :src="schemeForm.designs[face.id].image"
                          :preview-src-list="[schemeForm.designs[face.id].image]"
                          :preview-teleported="true"
                          fit="cover"
                          class="photo-img"
                        />
                        <div v-else-if="canEdit" class="photo-placeholder upload-placeholder" @click.stop="triggerFaceUpload(face.id)">
                          <el-icon><Plus /></el-icon>
                          上传设计图
                        </div>
                        <div v-else class="photo-placeholder">设计图</div>
                        <span class="photo-slot-label design">设计图</span>
                      </div>
                    </div>
                    <div class="face-remark" v-if="face.remark">
                      <span class="face-remark-label">备注</span>
                      <span class="face-remark-text">{{ face.remark }}</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 派单弹窗 -->
    <el-dialog v-model="dispatchVisible" title="派单" width="420px">
      <el-form :model="dispatchForm" label-width="80px">
        <el-form-item label="设计师">
          <el-select v-model="dispatchForm.handler_id" placeholder="选择设计师" style="width: 100%">
            <el-option v-for="d in designers" :key="d.id" :label="d.real_name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dispatchForm.remark" type="textarea" :rows="2" placeholder="派单备注..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="submitDispatch">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Document, Location, DataLine, EditPen, Files, Plus, Close, Check } from '@element-plus/icons-vue'
import { designApi, designManageApi } from '@/api'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/composables/useFormat'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const orderId = route.params.id

const loading = ref(false)
const submitting = ref(false)
const dispatchLoading = ref(false)
const dispatchVisible = ref(false)
const hasUnsavedChanges = ref(false)
const expandedTypesList = ref([])

const order = ref(null)
const designScheme = ref(null)
const designers = ref([])

const faceSelections = reactive({})
const selectedFaceIds = computed(() => Object.keys(faceSelections).filter(id => faceSelections[id]))

const schemeForm = reactive({
  designs: {},
  groups: [],
  remark: '',
  cdrFile: null
})

const dispatchForm = reactive({ handler_id: '', remark: '' })
const cdrFile = ref(null)
const cdrUploading = ref(false)

const canEdit = computed(() => {
  const role = userStore.user?.role
  const isHandler = order.value?.current_handler_id === userStore.user?.id
  return (role === 'designer' && isHandler) || role === 'admin'
})

const canManage = computed(() => ['admin'].includes(userStore.user?.role))

const statusMap = {
  designing: { text: '设计中', badgeClass: 'designing' },
  design_review: { text: '待审核', badgeClass: 'review' },
  producing: { text: '已通过', badgeClass: 'done' },
  archived: { text: '已归档', badgeClass: 'done' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusBadgeClass = (status) => statusMap[status]?.badgeClass || 'done'

const measureFaces = computed(() => {
  if (order.value?.adItems) {
    const faces = []
    order.value.adItems.forEach(item => {
      if (item.faces) {
        item.faces.forEach(face => faces.push({ ...face, adItem: item }))
      }
    })
    return faces
  }
  return []
})

const typeStats = computed(() => {
  const stats = {}
  measureFaces.value.forEach(face => {
    const name = face.adItem?.adType?.name || '未分类'
    stats[name] = (stats[name] || 0) + 1
  })
  return stats
})

const isTypeExpanded = (typeName) => expandedTypesList.value.includes(typeName)

const toggleType = (typeName) => {
  const idx = expandedTypesList.value.indexOf(typeName)
  if (idx > -1) expandedTypesList.value.splice(idx, 1)
  else expandedTypesList.value.push(typeName)
}

const getUngroupedFaces = (typeName) => {
  const groupedIds = new Set(schemeForm.groups.flatMap(g => g.faceIds))
  return measureFaces.value.filter(face => {
    const faceTypeName = face.adItem?.adType?.name || ''
    return faceTypeName === typeName && !groupedIds.has(String(face.id))
  })
}

const getTypeGroups = (typeName) => {
  return schemeForm.groups.filter(group => {
    const firstFace = measureFaces.value.find(f => String(f.id) === String(group.faceIds[0]))
    const faceTypeName = firstFace?.adItem?.adType?.name || ''
    return faceTypeName === typeName
  })
}

const typeGroupsData = computed(() => {
  const groups = {}
  measureFaces.value.forEach(face => {
    const typeName = face.adItem?.adType?.name || '未分类'
    if (!groups[typeName]) groups[typeName] = []
    groups[typeName].push(face)
  })
  return groups
})

const calculateTypeArea = (typeName) => {
  const faces = measureFaces.value.filter(f => (f.adItem?.adType?.name || '') === typeName)
  const total = faces.reduce((sum, f) => sum + ((f.width || 0) * (f.height || 0) / 10000), 0)
  return total.toFixed(2)
}

const getTypeDesignData = (typeName) => {
  const list = []
  const shopName = order.value?.title || order.value?.form_data?.company || ''
  const orderNo = order.value?.order_no || ''
  const mergedFaceIds = new Set()
  getTypeGroups(typeName).forEach(g => {
    g.faceIds.forEach(id => mergedFaceIds.add(String(id)))
  })

  getFacesByType(typeName).forEach(face => {
    if (!mergedFaceIds.has(String(face.id))) {
      list.push({
        name: `${orderNo}-${shopName}-${typeName}-${face.width}X${face.height}cm`,
        faceName: face.face_name
      })
    }
  })

  getTypeGroups(typeName).forEach(g => {
    let totalWidth = 0, totalHeight = 0
    const faceNames = []
    g.faceIds.forEach(faceId => {
      const face = measureFaces.value.find(f => String(f.id) === String(faceId))
      if (face) {
        totalWidth += Number(face.width) || 0
        totalHeight += Number(face.height) || 0
        faceNames.push(face.face_name)
      }
    })
    list.push({
      name: `${orderNo}-${shopName}-${typeName}-${totalWidth}X${totalHeight}cm`,
      faceName: faceNames.join('+') + '(合并)'
    })
  })

  return list
}

const getFacesByType = (typeName) => {
  return measureFaces.value.filter(face => {
    const adTypeName = face.adItem?.adType?.name
    return adTypeName === typeName || (!adTypeName && !typeName)
  })
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}

const toggleFaceSelection = (faceId) => {
  faceSelections[faceId] = !faceSelections[faceId]
}

const isGroupSelected = (g) => g.faceIds.every(id => faceSelections[id])

const toggleGroupSelection = (g) => {
  const isSelected = isGroupSelected(g)
  g.faceIds.forEach(id => { faceSelections[id] = !isSelected })
}

const canSelectFace = (faceId) => true

const mergeSelected = () => {
  const selectedIds = selectedFaceIds.value
  if (selectedIds.length < 2) return

  const selectedGroups = schemeForm.groups.filter(g => g.faceIds.some(id => selectedIds.includes(id)))
  const ungroupedSelectedIds = selectedIds.filter(id => !schemeForm.groups.some(g => g.faceIds.includes(id)))
  const allSelectedFaceIds = [...ungroupedSelectedIds]
  selectedGroups.forEach(g => g.faceIds.forEach(id => { if (!allSelectedFaceIds.includes(id)) allSelectedFaceIds.push(id) }))

  if (selectedGroups.length === 0 && ungroupedSelectedIds.length >= 2) {
    ungroupedSelectedIds.forEach(id => delete schemeForm.designs[id])
    schemeForm.groups.push({ faceIds: [...ungroupedSelectedIds], image: '' })
  } else if (selectedGroups.length === 1 && ungroupedSelectedIds.length >= 1) {
    const targetGroup = selectedGroups[0]
    ungroupedSelectedIds.forEach(id => {
      delete schemeForm.designs[id]
      targetGroup.faceIds.push(id)
    })
  } else if (selectedGroups.length > 1) {
    const firstGroup = selectedGroups[0]
    selectedGroups.slice(1).forEach(g => {
      firstGroup.faceIds.push(...g.faceIds)
      if (g.image && !firstGroup.image) firstGroup.image = g.image
    })
    selectedGroups.slice(1).forEach(g => {
      const idx = schemeForm.groups.indexOf(g)
      if (idx > -1) schemeForm.groups.splice(idx, 1)
    })
    ungroupedSelectedIds.forEach(id => {
      delete schemeForm.designs[id]
      firstGroup.faceIds.push(id)
    })
  }

  Object.keys(faceSelections).forEach(id => faceSelections[id] = false)
  hasUnsavedChanges.value = true
}

const getFaceName = (faceId) => {
  const face = measureFaces.value.find(f => String(f.id) === String(faceId))
  return face?.face_name || `面${faceId}`
}

const getGroupSize = (g) => {
  let totalWidth = 0, totalHeight = 0
  g.faceIds.forEach(faceId => {
    const face = measureFaces.value.find(f => String(f.id) === String(faceId))
    if (face) {
      totalWidth += Number(face.width) || 0
      totalHeight += Number(face.height) || 0
    }
  })
  return `${totalWidth}×${totalHeight}cm`
}

const getGroupRemarks = (g) => {
  const remarks = []
  g.faceIds.forEach(faceId => {
    const face = measureFaces.value.find(f => String(f.id) === String(faceId))
    if (face?.remark) remarks.push({ faceName: face.face_name, remark: face.remark })
  })
  return remarks
}

const getFacePhotos = (faceId) => {
  const face = measureFaces.value.find(f => String(f.id) === String(faceId))
  return face?.photos || []
}

const handleDesignUpload = async (file, faceId) => {
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    ElMessage.error('只支持 JPG/PNG')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('最大 10MB')
    return false
  }
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    if (data.code === 0 && data.data?.url) {
      schemeForm.designs[faceId] = { image: data.data.url }
      hasUnsavedChanges.value = true
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  }
  return false
}

const handleGroupUpload = async (file, g) => {
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    ElMessage.error('只支持 JPG/PNG')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('最大 10MB')
    return false
  }
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/upload/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    if (data.code === 0 && data.data?.url) {
      g.image = data.data.url
      hasUnsavedChanges.value = true
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  }
  return false
}

const triggerFaceUpload = (faceId) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.jpg,.jpeg,.png'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) handleDesignUpload(file, faceId)
  }
  input.click()
}

const triggerGroupUpload = (g) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.jpg,.jpeg,.png'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) handleGroupUpload(file, g)
  }
  input.click()
}

const removeGroup = (g) => {
  const index = schemeForm.groups.indexOf(g)
  if (index > -1) {
    schemeForm.groups.splice(index, 1)
    hasUnsavedChanges.value = true
  }
}

const handleSubmit = async () => {
  const groups = []
  measureFaces.value.forEach(face => {
    const design = schemeForm.designs[face.id]
    if (design?.image) {
      groups.push({
        name: face.face_name,
        width: face.width * 10,
        height: face.height * 10,
        material: face.material?.name || '',
        faceIds: [Number(face.id)],
        drawings: [{ name: face.face_name, file_path: design.image }]
      })
    }
  })
  schemeForm.groups.forEach((g, idx) => {
    if (g.image) {
      const faces = g.faceIds.map(id => measureFaces.value.find(f => String(f.id) === String(id))).filter(Boolean)
      groups.push({
        name: `图组${idx + 1}`,
        width: faces.reduce((s, f) => s + (parseFloat(f.width) || 0), 0) * 10,
        height: Math.max(...faces.map(f => parseFloat(f.height) || 0)) * 10,
        material: faces[0]?.material?.name || '',
        faceIds: g.faceIds.map(id => Number(id)),
        drawings: [{ name: `图组${idx + 1}`, file_path: g.image }]
      })
    }
  })

  if (groups.length === 0) return ElMessage.warning('请上传设计图')
  if (!schemeForm.cdrFile) return ElMessage.warning('请上传CDR源文件')

  submitting.value = true
  try {
    await designApi.submitScheme(orderId, { groups, remark: schemeForm.remark, cdrFile: schemeForm.cdrFile })
    ElMessage.success('提交成功')
    hasUnsavedChanges.value = false
    fetchDetail()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const handleDispatch = () => {
  dispatchForm.handler_id = order.value?.current_handler_id || ''
  dispatchVisible.value = true
}

const submitDispatch = async () => {
  if (!dispatchForm.handler_id) return ElMessage.warning('请选择设计师')
  dispatchLoading.value = true
  try {
    await designManageApi.dispatch(orderId, dispatchForm)
    ElMessage.success('派单成功')
    dispatchVisible.value = false
    fetchDetail()
  } catch (err) {
    ElMessage.error('派单失败')
  } finally {
    dispatchLoading.value = false
  }
}

const handleBack = () => router.push('/design')

const handleCdrUpload = async (file) => {
  if (!file.name.toLowerCase().endsWith('.cdr')) {
    ElMessage.error('只支持 .cdr 格式的文件')
    return false
  }
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 100MB')
    return false
  }
  cdrUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/upload/cdr', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    if (data.code === 0 && data.data?.url) {
      schemeForm.cdrFile = data.data.url
      cdrFile.value = data.data
      hasUnsavedChanges.value = true
      ElMessage.success('CDR文件上传成功')
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败')
  } finally {
    cdrUploading.value = false
  }
  return false
}

const triggerCdrUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.cdr'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) handleCdrUpload(file)
  }
  input.click()
}

const removeCdrFile = () => {
  schemeForm.cdrFile = null
  cdrFile.value = null
  hasUnsavedChanges.value = true
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await designApi.getDetail(orderId)
    order.value = res.data
    designScheme.value = res.data?.designScheme
    schemeForm.remark = designScheme.value?.remark || ''
    schemeForm.designs = {}
    schemeForm.groups = []
    schemeForm.cdrFile = designScheme.value?.cdr_file || null
    cdrFile.value = designScheme.value?.cdr_file ? { originalname: designScheme.value.cdr_file.split('/').pop() } : null

    measureFaces.value.forEach(f => { faceSelections[f.id] = false })

    if (designScheme.value?.groups) {
      designScheme.value.groups.forEach(g => {
        const faceIds = g.faceRelations?.map(r => String(r.measure_face_id)) || []
        const image = g.drawings?.[0]?.file_url || g.drawings?.[0]?.file_path || ''
        if (faceIds.length === 1) {
          schemeForm.designs[faceIds[0]] = { image }
        } else if (faceIds.length > 1) {
          schemeForm.groups.push({ faceIds, image })
        }
      })
    }

    const typeNames = Object.keys(typeGroupsData.value)
    if (typeNames.length > 0) expandedTypesList.value = [typeNames[0]]

    if (canManage.value) {
      try {
        const designersRes = await designManageApi.getDesigners()
        designers.value = designersRes.data || []
      } catch (e) {}
    }
  } catch (err) {
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.design-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
}

/* ===== 顶部导航 ===== */
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.back-btn {
  flex-shrink: 0;
}
.order-header {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}
.order-no {
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 700;
  font-size: 16px;
  color: var(--text-primary);
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 600;
}
.status-badge.designing { background: var(--brand-primary-light); color: var(--brand-primary); }
.status-badge.review { background: var(--amber-bg); color: var(--amber); }
.status-badge.done { background: var(--green-bg); color: var(--green); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status-badge.designing .status-dot { background: var(--brand-primary); }
.status-badge.review .status-dot { background: var(--amber); }
.status-badge.done .status-dot { background: var(--green); }
.top-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== 主布局 ===== */
.main-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1024px) {
  .main-layout { grid-template-columns: 1fr; }
}

/* ===== 左侧信息面板 ===== */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 20px;
}
.info-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary, #f8fafc);
}
.info-card-header .el-icon { color: var(--text-secondary); }
.info-card-header h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.info-card-body { padding: 14px 16px; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
  font-size: 13px;
}
.info-row + .info-row { border-top: 1px solid var(--border-light, #f1f5f9); }
.info-label { color: var(--text-secondary); white-space: nowrap; }
.info-value { color: var(--text-primary); font-weight: 500; text-align: right; max-width: 180px; word-break: break-all; }
.info-value.mono { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }

/* 类型统计 */
.type-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.type-stat {
  background: var(--bg-tertiary, #f8fafc);
  border-radius: var(--radius-md);
  padding: 12px;
  text-align: center;
}
.type-stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.type-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 备注 */
.remark-box { width: 100%; }
.remark-display {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* CDR文件 */
.cdr-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--green-bg);
  border-radius: var(--radius-md);
}
.cdr-icon {
  width: 32px;
  height: 32px;
  background: var(--green);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.cdr-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.no-cdr {
  color: var(--text-tertiary);
  font-size: 13px;
}

/* ===== 右侧设计区 ===== */
.design-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 类型分组 */
.type-group {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-tertiary, #f8fafc);
  cursor: pointer;
  transition: background 0.15s;
}
.type-header:hover { background: var(--bg-hover, #f1f5f9); }
.type-header-left { display: flex; align-items: center; gap: 10px; }
.type-chevron {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}
.type-chevron.open { transform: rotate(90deg); }
.type-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.type-header-right { display: flex; align-items: center; gap: 10px; }
.type-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--bg-page, #f1f5f9);
  color: var(--text-secondary);
  font-weight: 500;
}
.type-area { font-size: 11px; color: var(--brand-primary); font-weight: 600; }

.type-body { padding: 16px; }

.type-content {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1200px) {
  .type-content { grid-template-columns: 1fr; }
}

/* 设计资料 */
.design-data-sidebar {
  background: var(--brand-primary-light);
  border: 1px solid var(--brand-primary-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: sticky;
  top: 16px;
}
.data-header {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-primary);
  background: rgba(99,102,241,0.06);
  border-bottom: 1px solid var(--brand-primary-border);
}
.data-items {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 500px;
  overflow-y: auto;
}
.data-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.data-item:hover { background: rgba(99,102,241,0.1); }
.data-name {
  flex: 1;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, monospace;
  word-break: break-all;
}
.data-face { font-size: 10px; color: var(--text-tertiary); flex-shrink: 0; }

/* 面卡片网格 */
.faces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.face-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s;
}
.face-card:hover { border-color: var(--brand-primary-border); box-shadow: 0 2px 8px rgba(99,102,241,0.08); }
.face-card.merged { border-color: var(--brand-primary-border); }
.face-card.selected {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px var(--brand-primary-light);
}
.face-card.disabled { opacity: 0.5; pointer-events: none; }

.face-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-tertiary, #f8fafc);
  border-bottom: 1px solid var(--border);
}
.face-card-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.face-card-size {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', Monaco, monospace;
}

.face-card-body { padding: 12px 14px; }

.photo-compare {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.photo-slot {
  flex: 1;
  position: relative;
}
.photo-slot-label {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  z-index: 1;
}
.photo-slot-label.measure { background: rgba(0,0,0,0.6); color: #fff; }
.photo-slot-label.design { background: var(--brand-primary); color: #fff; }

.photo-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--bg-tertiary, #f8fafc);
}
.photo-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px dashed var(--brand-primary-border);
  border-radius: var(--radius-sm);
  color: var(--brand-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.photo-placeholder:hover { background: var(--brand-primary-light); }
.photo-placeholder .el-icon { width: 20px; height: 20px; }

.face-remark {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  background: var(--amber-bg);
  border: 1px solid rgba(245,158,11,0.15);
  border-radius: var(--radius-sm);
  font-size: 12px;
}
.face-remark-label { color: #d97706; font-weight: 500; white-space: nowrap; }
.face-remark-text { color: var(--text-secondary); word-break: break-all; }

.remarks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .info-panel { position: static; }
}
@media (max-width: 600px) {
  .faces-grid { grid-template-columns: 1fr; }
  .type-stats { grid-template-columns: 1fr 1fr; }
}
</style>
