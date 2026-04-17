<template>
  <div v-loading="loading" class="construction-detail-page">
    <!-- 顶部信息栏 -->
    <div class="top-header">
      <div class="header-left">
        <el-button text @click="$router.back()" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="wo-badge">{{ workOrder.work_order_no }}</div>
        <h1 class="page-title">{{ workOrder.title }}</h1>
        <el-tag :type="statusType(record.status)" effect="light">{{ statusLabel(record.status) }}</el-tag>
      </div>
      <div class="header-right">
        <el-button v-if="record.status === 'completed'" type="success" @click="openVerifyDialog">验收</el-button>
        <el-button v-if="record.status === 'scheduled'" type="warning" @click="startConstruction">开始施工</el-button>
      </div>
    </div>

    <!-- 工单进度条 -->
    <div class="progress-bar">
      <el-steps :active="progressStep" finish-status="success" simple>
        <el-step title="待施工" />
        <el-step title="施工中" />
        <el-step title="已完成" />
        <el-step title="内部验收" />
        <el-step title="甲方验收" />
      </el-steps>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：工单信息 -->
      <el-card class="info-card">
        <template #header>
          <span class="card-title">工单信息</span>
        </template>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="项目">
            <el-tag v-if="projectName" type="primary" effect="plain">{{ projectName }}</el-tag>
            <span v-else class="text-muted">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="施工员">{{ record.constructor?.real_name || record.constructor_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ record.constructor?.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="施工日期">{{ record.constructed_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ record.duration_minutes ? record.duration_minutes + ' 分钟' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="施工说明">{{ record.notes || '—' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 验收信息 -->
        <div v-if="showVerifyInfo" class="verify-section">
          <div class="divider"></div>
          <h4 class="section-subtitle">验收记录</h4>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="内部验收">
              <el-tag v-if="record.status === 'internally_verified' || record.status === 'accepted'" type="success" size="small">通过</el-tag>
              <span v-else class="text-muted">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="验收日期">{{ record.internal_verified_at || '-' }}</el-descriptions-item>
            <el-descriptions-item label="甲方验收">
              <el-tag v-if="record.status === 'accepted'" type="success" size="small">通过</el-tag>
              <span v-else class="text-muted">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="验收日期">{{ record.client_verified_at || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 中间：现场照片 -->
      <el-card class="photo-card">
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">现场照片</span>
            <el-dropdown trigger="click" @command="handleAddPhoto">
              <el-button type="primary" size="small">
                <el-icon><Plus /></el-icon>
                上传照片
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="before">施工前</el-dropdown-item>
                  <el-dropdown-item command="during">施工中</el-dropdown-item>
                  <el-dropdown-item command="after">施工后</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <div class="photo-sections">
          <div v-if="record.before_photos?.length" class="photo-section">
            <div class="photo-section-header">
              <span class="photo-section-title">施工前（{{ record.before_photos.length }}张）</span>
            </div>
            <div class="photo-grid">
              <div v-for="(url, i) in record.before_photos" :key="'b' + i" class="photo-item-wrapper">
                <el-image :src="url" :preview-src-list="record.before_photos" fit="cover" class="photo-item" />
                <div class="photo-delete" @click="removePhoto('before', i)">
                  <el-icon><Close /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <div v-if="record.during_photos?.length" class="photo-section">
            <div class="photo-section-header">
              <span class="photo-section-title">施工中（{{ record.during_photos.length }}张）</span>
            </div>
            <div class="photo-grid">
              <div v-for="(url, i) in record.during_photos" :key="'d' + i" class="photo-item-wrapper">
                <el-image :src="url" :preview-src-list="record.during_photos" fit="cover" class="photo-item" />
                <div class="photo-delete" @click="removePhoto('during', i)">
                  <el-icon><Close /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <div v-if="record.after_photos?.length" class="photo-section">
            <div class="photo-section-header">
              <span class="photo-section-title">施工后（{{ record.after_photos.length }}张）</span>
            </div>
            <div class="photo-grid">
              <div v-for="(url, i) in record.after_photos" :key="'a' + i" class="photo-item-wrapper">
                <el-image :src="url" :preview-src-list="record.after_photos" fit="cover" class="photo-item" />
                <div class="photo-delete" @click="removePhoto('after', i)">
                  <el-icon><Close /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <el-empty v-if="!hasPhotos" description="暂无现场照片" :image-size="80" />
        </div>
      </el-card>

      <!-- 右侧：施工日志 -->
      <el-card class="log-card">
        <template #header>
          <div class="card-header-flex">
            <span class="card-title">施工日志</span>
            <el-button type="primary" size="small" @click="openLogDialog">
              <el-icon><Plus /></el-icon>
              添加日志
            </el-button>
          </div>
        </template>

        <div class="log-list" v-if="logs.length">
          <div v-for="log in logs" :key="log.id" class="log-item">
            <div class="log-header">
              <span class="log-date">{{ log.log_date }}</span>
              <span v-if="log.weather" class="log-weather">{{ log.weather }}</span>
              <div class="log-actions">
                <el-button type="primary" link size="small" @click="editLog(log)">编辑</el-button>
                <el-button type="danger" link size="small" @click="deleteLog(log.id)">删除</el-button>
              </div>
            </div>
            <div v-if="log.content" class="log-content">{{ log.content }}</div>
            <div v-if="log.labor_count || log.labor_hours" class="log-labor">
              <span v-if="log.labor_count">人数: {{ log.labor_count }}人</span>
              <span v-if="log.labor_hours">工时: {{ log.labor_hours }}小时</span>
            </div>
            <div v-if="log.problem_description" class="log-problem">
              <el-tag type="warning" size="small">问题</el-tag>
              {{ log.problem_description }}
            </div>
            <div v-if="log.photos?.length" class="log-photos">
              <el-image v-for="(url, i) in log.photos" :key="i" :src="url" :preview-src-list="log.photos" fit="cover" class="log-photo" />
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无施工日志" :image-size="80" />
      </el-card>
    </div>

    <!-- 添加/编辑日志对话框 -->
    <el-dialog v-model="showLogDialog" :title="editingLog ? '编辑日志' : '添加日志'" width="560px" destroy-on-close>
      <el-form :model="logForm" label-width="90px">
        <el-form-item label="日期" required>
          <el-date-picker v-model="logForm.log_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="天气">
          <el-select v-model="logForm.weather" placeholder="选择天气" clearable style="width: 100%">
            <el-option label="晴" value="晴" />
            <el-option label="多云" value="多云" />
            <el-option label="阴" value="阴" />
            <el-option label="小雨" value="小雨" />
            <el-option label="大雨" value="大雨" />
            <el-option label="雪" value="雪" />
          </el-select>
        </el-form-item>
        <el-form-item label="施工内容">
          <el-input v-model="logForm.content" type="textarea" :rows="3" placeholder="描述当天施工内容" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="人数">
              <el-input-number v-model="logForm.labor_count" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工时">
              <el-input-number v-model="logForm.labor_hours" :min="0.5" :max="24" :step="0.5" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="问题描述">
          <el-input v-model="logForm.problem_description" type="textarea" :rows="2" placeholder="遇到的问题或特殊情况" />
        </el-form-item>
        <el-form-item label="照片">
          <FileUpload v-model="logForm.photos" :limit="9" accept="image/*" list-type="picture-card" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLogDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLog" :loading="savingLog">保存</el-button>
      </template>
    </el-dialog>

    <!-- 验收对话框 -->
    <el-dialog v-model="showVerifyDialog" title="施工验收" width="480px">
      <el-form :model="verifyForm" label-width="100px">
        <el-form-item label="验收结果" required>
          <el-radio-group v-model="verifyForm.result">
            <el-radio :label="true">通过</el-radio>
            <el-radio :label="false">不通过，退回整改</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验收说明">
          <el-input v-model="verifyForm.notes" type="textarea" :rows="3" :placeholder="verifyForm.result ? '填写验收意见' : '填写整改要求'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showVerifyDialog = false">取消</el-button>
        <el-button :type="verifyForm.result ? 'success' : 'danger'" @click="submitVerify" :loading="submitting">
          {{ verifyForm.result ? '确认通过' : '退回整改' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件上传 -->
    <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="handleFileSelect" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Close } from '@element-plus/icons-vue'
import api from '../api'
import FileUpload from '../components/FileUpload.vue'

const route = useRoute()
const loading = ref(true)
const submitting = ref(false)
const savingLog = ref(false)
const fileInput = ref(null)
const currentPhotoType = ref('before')

const record = ref({})
const workOrder = ref({})
const logs = ref([])

const projectName = computed(() => {
  const cd = workOrder.value.custom_data
  return (typeof cd === 'string' ? JSON.parse(cd).project_name : cd?.project_name) || null
})

const hasPhotos = computed(() => {
  return (record.value.before_photos?.length || 0) +
    (record.value.during_photos?.length || 0) +
    (record.value.after_photos?.length || 0) > 0
})

const showVerifyInfo = computed(() => {
  return !['scheduled', 'installing'].includes(record.value.status)
})

const progressStep = computed(() => {
  const map = { scheduled: 0, installing: 1, completed: 2, internally_verified: 3, accepted: 4, rejected: 2 }
  return map[record.value.status] ?? 0
})

const STATUS_MAP = {
  scheduled: '待施工',
  installing: '施工中',
  completed: '已完成',
  internally_verified: '内部验收通过',
  accepted: '甲方已验收',
  rejected: '退回整改',
}

function statusLabel(s) { return STATUS_MAP[s] || s }
function statusType(s) {
  const map = { scheduled: 'info', installing: 'warning', completed: 'primary', internally_verified: 'success', accepted: 'success', rejected: 'danger' }
  return map[s] || ''
}

// 日志表单
const showLogDialog = ref(false)
const editingLog = ref(null)
const logForm = reactive({
  log_date: '',
  weather: '',
  content: '',
  labor_count: null,
  labor_hours: null,
  problem_description: '',
  photos: [],
})

function openLogDialog() {
  editingLog.value = null
  Object.assign(logForm, { log_date: '', weather: '', content: '', labor_count: null, labor_hours: null, problem_description: '', photos: [] })
  showLogDialog.value = true
}

function editLog(log) {
  editingLog.value = log
  Object.assign(logForm, {
    log_date: log.log_date,
    weather: log.weather || '',
    content: log.content || '',
    labor_count: log.labor_count,
    labor_hours: log.labor_hours,
    problem_description: log.problem_description || '',
    photos: log.photos || [],
  })
  showLogDialog.value = true
}

async function saveLog() {
  if (!logForm.log_date) {
    return ElMessage.warning('请选择日期')
  }
  savingLog.value = true
  try {
    if (editingLog.value) {
      await api.put(`/construction/logs/${editingLog.value.id}`, logForm)
      ElMessage.success('更新成功')
    } else {
      await api.post(`/construction/${route.params.workOrderId}/logs`, logForm)
      ElMessage.success('添加成功')
    }
    showLogDialog.value = false
    await fetchLogs()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    savingLog.value = false
  }
}

async function deleteLog(id) {
  try {
    await ElMessageBox.confirm('确定删除此日志？', '提示', { type: 'warning' })
    await api.delete(`/construction/logs/${id}`)
    ElMessage.success('已删除')
    await fetchLogs()
  } catch {}
}

// 照片管理
function handleAddPhoto(type) {
  currentPhotoType.value = type
  fileInput.value?.click()
}

async function handleFileSelect(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  const formData = new FormData()
  files.forEach(f => formData.append('files', f))

  try {
    const res = await api.post('/files/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const urls = res.files?.map(f => f.url) || res.data?.files?.map(f => f.url) || []
    if (urls.length) {
      const field = `${currentPhotoType.value}_photos`
      const current = record.value[field] || []
      record.value[field] = [...current, ...urls]
      await savePhotos()
    }
  } catch (err) {
    ElMessage.error('上传失败')
  }
  e.target.value = ''
}

async function removePhoto(type, index) {
  try {
    await ElMessageBox.confirm('确定删除此照片？', '提示', { type: 'warning' })
    const field = `${type}_photos`
    record.value[field].splice(index, 1)
    await savePhotos()
  } catch {}
}

async function savePhotos() {
  try {
    await api.post(`/construction/${route.params.workOrderId}`, {
      before_photos: record.value.before_photos,
      during_photos: record.value.during_photos,
      after_photos: record.value.after_photos,
    })
    ElMessage.success('已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}

// 验收
const showVerifyDialog = ref(false)
const verifyForm = reactive({ result: true, notes: '' })

function openVerifyDialog() {
  verifyForm.result = true
  verifyForm.notes = ''
  showVerifyDialog.value = true
}

async function submitVerify() {
  submitting.value = true
  try {
    await api.post(`/construction/${route.params.workOrderId}/internal-verify`, {
      verified: verifyForm.result,
      notes: verifyForm.notes,
    })
    ElMessage.success(verifyForm.result ? '验收通过' : '已退回整改')
    showVerifyDialog.value = false
    await fetchDetail()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 开始施工
async function startConstruction() {
  try {
    await ElMessageBox.confirm('确认开始施工？', '提示', { type: 'warning' })
    await api.post(`/construction/${route.params.workOrderId}`, { notes: '施工中' })
    ElMessage.success('已开始施工')
    await fetchDetail()
  } catch {}
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get(`/construction/tasks/${route.params.workOrderId}`)
    const d = res.data || {}
    workOrder.value = d.work_order || {}
    record.value = d.constructions?.[0] || {}
  } catch {
    workOrder.value = {}
    record.value = {}
  } finally {
    loading.value = false
  }
}

async function fetchLogs() {
  try {
    const res = await api.get(`/construction/${route.params.workOrderId}/logs`)
    logs.value = res.data || []
  } catch {
    logs.value = []
  }
}

onMounted(async () => {
  await fetchDetail()
  await fetchLogs()
})
</script>

<style scoped>
.construction-detail-page {
  padding: 16px;
  background: var(--color-bg-page);
  min-height: calc(100vh - 60px);
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  padding: 4px 8px;
}

.wo-badge {
  background: var(--color-primary);
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.progress-bar {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.main-content {
  display: grid;
  grid-template-columns: 280px 1fr 1fr;
  gap: 16px;
}

.info-card, .photo-card, .log-card {
  border-radius: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.verify-section {
  margin-top: 16px;
}

.divider {
  height: 1px;
  background: var(--color-border-light);
  margin-bottom: 12px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--color-text-secondary);
}

.photo-sections {
  max-height: 500px;
  overflow-y: auto;
}

.photo-section {
  margin-bottom: 16px;
}

.photo-section-header {
  margin-bottom: 8px;
}

.photo-section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.photo-item-wrapper {
  position: relative;
  aspect-ratio: 1;
}

.photo-item {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
}

.photo-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-item-wrapper:hover .photo-delete {
  opacity: 1;
}

.log-list {
  max-height: 500px;
  overflow-y: auto;
}

.log-item {
  padding: 12px;
  border-bottom: 1px solid var(--color-border-lighter);
}

.log-item:last-child {
  border-bottom: none;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.log-date {
  font-weight: 600;
  font-size: 14px;
}

.log-weather {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.log-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.log-content {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.log-labor {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.log-problem {
  font-size: 13px;
  color: var(--color-warning);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.log-photos {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.log-photo {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  cursor: pointer;
}

.text-muted {
  color: var(--color-text-placeholder);
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }
  .info-card {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  .info-card {
    grid-column: span 1;
  }
}
</style>
