<template>
  <div v-loading="loading">
    <!-- Header -->
    <div class="flex-between mb-20">
      <div>
        <el-button @click="$router.back()" class="mb-8">&larr; 返回</el-button>
        <h1 class="page-title"><span class="wo-no">{{ detail.work_order_no }}</span> {{ detail.title }}</h1>
      </div>
      <div>
        <el-button v-if="canEdit" @click="showEditDialog = true">编辑</el-button>
        <el-button @click="handleExport">导出 PDF</el-button>
        <el-button type="primary" @click="handlePrint">打印</el-button>
        <el-button v-if="canEdit" type="danger" @click="deleteWorkOrder">删除</el-button>
      </div>
    </div>

    <!-- Progress Steps -->
    <el-card class="mb-20">
      <el-steps :active="currentStepIndex" finish-status="success" align-center>
        <el-step v-for="s in stages" :key="s.key" :title="s.label" />
      </el-steps>
    </el-card>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
      <div>
        <!-- Basic Info -->
        <el-card class="mb-20">
          <template #header><span class="section-title">基本信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="甲方企业">{{ detail.client_name }}</el-descriptions-item>
          <el-descriptions-item label="项目类型">{{ detail.project_type }}</el-descriptions-item>
          <el-descriptions-item label="项目分类">{{ detail.project_category }}</el-descriptions-item>
          <el-descriptions-item label="项目地址">{{ detail.address }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detail.contact_name }} {{ detail.contact_phone }}</el-descriptions-item>
          <el-descriptions-item label="需求描述" :span="2">{{ detail.description }}</el-descriptions-item>
        </el-descriptions>
        </el-card>

        <!-- Photos -->
        <el-card class="mb-20" v-if="detail.photos?.length">
          <template #header><span class="section-title">现场照片（{{ detail.photos.length }}张）</span></template>
          <div class="photo-grid">
            <el-image v-for="(url, i) in detail.photos" :key="i" :src="url" :preview-src-list="detail.photos"
              fit="cover" class="photo-item" />
          </div>
        </el-card>

        <!-- Measurement Data -->
        <el-card class="mb-20" v-if="detail.measurement">
          <template #header>
            <div class="flex-between">
              <span class="section-title">测量数据</span>
              <el-button type="primary" size="small" @click="$router.push(`/work-orders/${id}/measure-review`)">审核</el-button>
            </div>
          </template>
          <div class="material-section" v-for="(mat, mi) in detail.measurement.materials" :key="mi">
            <div class="mat-header">
              <span>{{ mat.type }} — {{ mat.faces.length }}面 &nbsp;
                <el-tag size="small">合计 {{ mat.faces.reduce((s, f) => s + (f.area || 0), 0).toFixed(2) }}㎡</el-tag>
              </span>
            </div>
            <div class="mat-body">
              <div class="face-row" v-for="(face, fi) in mat.faces" :key="fi">
                <span class="face-label">{{ face.label }}</span>
                <span>{{ face.width }} × {{ face.height }}m</span>
                <span class="face-area">{{ face.area || (face.width * face.height).toFixed(2) }}㎡</span>
                <span class="text-muted">{{ face.notes || '—' }}</span>
                <span class="action-link">{{ face.photos?.length || 0 }}张</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- Logs -->
        <el-card>
          <template #header><span class="section-title">操作日志</span></template>
          <el-timeline>
            <el-timeline-item v-for="log in logs" :key="log.id" :timestamp="log.created_at" placement="top">
              {{ log.detail }} <span class="text-muted">— {{ log.user_name }}</span>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </div>

      <!-- Right Panel -->
      <div>
        <el-card class="mb-20">
          <template #header><span class="section-title">当前环节</span></template>
          <div class="current-stage-box">
            <div class="stage-icon">{{ stageIcon }}</div>
            <div class="stage-name">{{ currentStageLabel }}</div>
          </div>
          <el-descriptions :column="1" class="mt-16">
            <el-descriptions-item label="负责人">{{ detail.assigned_to || '—' }}</el-descriptions-item>
            <el-descriptions-item label="截止">
              <span :class="{ 'text-danger': detail.is_timeout }">{{ detail.deadline || '—' }}</span>
            </el-descriptions-item>
          </el-descriptions>
          <div class="action-buttons">
            <el-button v-if="detail.current_stage === 'measurement' && detail.measurement" type="success" style="width:100%"
              @click="$router.push(`/work-orders/${id}/measure-review`)">审核测量数据</el-button>
            <el-button v-if="detail.current_stage === 'measurement' && !detail.measurement" type="warning" style="width:100%"
              @click="$router.push(`/work-orders/${id}/measure-review`)">代录测量数据</el-button>
            <el-button v-if="detail.current_stage === 'assignment'" type="primary" style="width:100%"
              @click="showDispatchDialog = true">派单</el-button>
          </div>
        </el-card>

        <el-card>
          <template #header><span class="section-title">甲方信息</span></template>
          <el-descriptions :column="1">
            <el-descriptions-item label="企业名称">{{ detail.client_name }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contact_name }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ detail.contact_phone }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </div>

    <!-- 派单对话框 -->
    <el-dialog v-model="showDispatchDialog" title="派单" width="460px">
      <el-form :model="dispatchForm" label-width="80px" ref="dispatchFormRef" :rules="dispatchRules">
        <el-form-item label="负责人" prop="assigned_to">
          <el-select v-model="dispatchForm.assigned_to" placeholder="选择测量员" style="width:100%">
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id">
              <span>{{ u.name }}</span>
              <span style="float:right;color:#8c8c8c;font-size:12px">{{ u.roleLabel }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="dispatchForm.deadline" type="date" placeholder="可选"
            value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dispatchForm.notes" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDispatchDialog = false">取消</el-button>
        <el-button type="primary" @click="submitDispatch" :loading="dispatching">确认派单</el-button>
      </template>
    </el-dialog>

    <!-- 编辑工单对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑工单" width="480px">
      <el-form :model="editForm" label-width="80px" ref="editFormRef" :rules="editRules">
        <el-form-item label="项目名称" prop="title">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="项目分类">
          <el-select v-model="editForm.project_category" style="width:100%">
            <el-option v-for="c in PROJECT_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="editing">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const loading = ref(true)
const detail = ref({})
const logs = ref([])

// 编辑/删除
const showEditDialog = ref(false)
const editing = ref(false)
const editFormRef = ref(null)
const editForm = reactive({ title: '', project_category: '', description: '' })
const editRules = {
  title: [{ required: true, message: '项目名称为必填项', trigger: 'blur' }]
}
const PROJECT_CATEGORIES = [
  { label: '日常', value: 'daily' },
  { label: '门头招牌', value: 'storefront' },
  { label: '室内广告', value: 'indoor_ad' },
  { label: 'LED大屏', value: 'led_screen' },
  { label: '520', value: '520' },
  { label: '国庆', value: 'national_day' },
  { label: '春节', value: 'spring_festival' },
]

const canEdit = computed(() =>
  detail.value.current_stage === 'assignment' && !detail.value.assigned_tenant_user_id
)

watch(showEditDialog, (val) => {
  if (val) {
    editForm.title = detail.value.title || ''
    editForm.project_category = detail.value.project_category || ''
    editForm.description = detail.value.description || ''
  }
})

async function submitEdit() {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  editing.value = true
  try {
    await api.put(`/work-orders/${id}`, editForm)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    const woRes = await api.get(`/work-orders/${id}`)
    detail.value = woRes.data || {}
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '更新失败')
  } finally {
    editing.value = false
  }
}

async function deleteWorkOrder() {
  try {
    await ElMessageBox.confirm('确定删除此工单吗？此操作不可恢复。', '提示', { type: 'warning' })
    await api.delete(`/work-orders/${id}`)
    ElMessage.success('已删除')
    router.back()
  } catch {}
}

// 派单
const showDispatchDialog = ref(false)
const dispatching = ref(false)
const dispatchFormRef = ref(null)
const userOptions = ref([])
const dispatchForm = reactive({ assigned_to: '', deadline: '', notes: '' })
const dispatchRules = {
  assigned_to: [{ required: true, message: '请选择负责人', trigger: 'change' }]
}
const roleMap = { admin: '管理员', dispatcher: '调度员', measurer: '测量员', designer: '设计师', producer: '生产', constructor: '施工', finance: '财务' }

async function loadTenantUsers() {
  try {
    const res = await api.get('/tenant/users')
    const payload = res.data || {}
    const users = Array.isArray(payload) ? payload : (payload.list || [])
    userOptions.value = users.filter(u => u.status === 'active').map(u => ({
      ...u,
      roleLabel: roleMap[u.role] || u.role
    }))
  } catch (e) {
    console.error('加载人员列表失败:', e)
  }
}

async function submitDispatch() {
  const valid = await dispatchFormRef.value.validate().catch(() => false)
  if (!valid) return
  dispatching.value = true
  try {
    await api.post('/assignments', {
      work_order_id: parseInt(id),
      assigned_to: dispatchForm.assigned_to,
      deadline: dispatchForm.deadline || null,
      notes: dispatchForm.notes || null,
    })
    ElMessage.success('派单成功')
    showDispatchDialog.value = false
    // 重新加载详情
    const woRes = await api.get(`/work-orders/${id}`)
    detail.value = woRes.data || {}
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '派单失败')
  } finally {
    dispatching.value = false
  }
}

watch(showDispatchDialog, (val) => {
  if (val) {
    dispatchForm.assigned_to = ''
    dispatchForm.deadline = ''
    dispatchForm.notes = ''
  }
})

const stages = [
  { key: 'declaration', label: '申报' },
  { key: 'approval', label: '审批' },
  { key: 'assignment', label: '派单' },
  { key: 'measurement', label: '测量' },
  { key: 'design', label: '设计' },
  { key: 'production', label: '生产' },
  { key: 'construction', label: '施工' },
  { key: 'archive', label: '归档' }
]

const currentStepIndex = computed(() => stages.findIndex(s => s.key === detail.value.current_stage))
const currentStageLabel = computed(() => {
  const s = stages.find(s => s.key === detail.value.current_stage)
  return s ? s.label : '未知'
})
const stageIcon = computed(() => {
  const icons = { declaration: '📋', approval: '✅', assignment: '📤', measurement: '📐', design: '🎨', production: '🏭', construction: '🔧', archive: '📁' }
  return icons[detail.value.current_stage] || '📋'
})

function handlePrint() {
  window.print()
}

function handleExport() {
  ElMessage.info('导出功能开发中，请先使用打印功能保存为 PDF')
  handlePrint()
}

onMounted(async () => {
  loadTenantUsers()
  try {
    const [woRes, logRes] = await Promise.all([
      api.get(`/work-orders/${id}`),
      api.get(`/work-orders/${id}/logs`)
    ])
    detail.value = woRes.data || {}
    logs.value = logRes.data || []
  } catch {
    ElMessage.error('加载失败')
    detail.value = {}
    logs.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-8 { margin-bottom: var(--space-2); }
.mb-20 { margin-bottom: var(--space-5); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.mt-16 { margin-top: var(--space-4); }
.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.text-danger { color: var(--color-danger); }
.action-link { color: var(--color-primary); cursor: pointer; }
.photo-grid { display: grid; grid-template-columns: repeat(5, 80px); gap: var(--space-2); }
.photo-item { width: 80px; height: 80px; border-radius: var(--radius-sm); cursor: pointer; }
.current-stage-box { text-align: center; padding: var(--space-4); }
.stage-icon { font-size: var(--font-size-xl); margin-bottom: var(--space-2); }
.stage-name { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.material-section { border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); margin-bottom: var(--space-3); overflow: hidden; }
.mat-header { background: var(--color-bg-page); padding: var(--space-3) var(--space-4); font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); }
.mat-body { padding: 0 var(--space-4); }
.face-row { display: grid; grid-template-columns: 60px 120px 80px 1fr 50px; gap: var(--space-2); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); font-size: var(--font-size-xs); }
.face-row:last-child { border-bottom: none; }
.face-label { color: var(--color-text-tertiary); }
.face-area { color: var(--color-primary); font-weight: var(--font-weight-medium); }
.action-buttons { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
</style>
