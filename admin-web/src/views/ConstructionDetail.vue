<template>
  <div v-loading="loading">
    <div class="page-header flex-between">
      <div>
        <el-button @click="$router.back()" class="mb-8">&larr; 返回</el-button>
        <h1 class="page-title">施工详情</h1>
      </div>
      <div>
        <el-button v-if="record.status === 'completed'" type="success" @click="openVerifyDialog">验收</el-button>
        <el-button v-if="record.status === 'scheduled'" type="warning" @click="startConstruction">开始施工</el-button>
      </div>
    </div>

    <!-- 基本信息 -->
    <el-card class="mb-20">
      <template #header><span class="section-title">工单信息</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="工单号">
          <router-link :to="`/work-orders/${record.work_order_id}`" class="wo-link">{{ workOrder.work_order_no }}</router-link>
        </el-descriptions-item>
        <el-descriptions-item label="项目名称">{{ workOrder.title }}</el-descriptions-item>
        <el-descriptions-item label="施工员">{{ record.constructor?.real_name || record.constructor_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ record.constructor?.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="施工日期">{{ record.constructed_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ record.duration_minutes ? record.duration_minutes + ' 分钟' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(record.status)">{{ statusLabel(record.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="施工说明" :span="2">{{ record.notes || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 现场照片 -->
    <el-card class="mb-20" v-if="hasPhotos">
      <template #header><span class="section-title">现场照片</span></template>

      <div v-if="record.before_photos?.length" class="photo-section">
        <h4 class="photo-title">施工前（{{ record.before_photos.length }}张）</h4>
        <div class="photo-grid">
          <el-image v-for="(url, i) in record.before_photos" :key="'b' + i" :src="url"
            :preview-src-list="record.before_photos" fit="cover" class="photo-item" />
        </div>
      </div>

      <div v-if="record.during_photos?.length" class="photo-section">
        <h4 class="photo-title">施工中（{{ record.during_photos.length }}张）</h4>
        <div class="photo-grid">
          <el-image v-for="(url, i) in record.during_photos" :key="'d' + i" :src="url"
            :preview-src-list="record.during_photos" fit="cover" class="photo-item" />
        </div>
      </div>

      <div v-if="record.after_photos?.length" class="photo-section">
        <h4 class="photo-title">施工后（{{ record.after_photos.length }}张）</h4>
        <div class="photo-grid">
          <el-image v-for="(url, i) in record.after_photos" :key="'a' + i" :src="url"
            :preview-src-list="record.after_photos" fit="cover" class="photo-item" />
        </div>
      </div>
    </el-card>

    <el-empty v-if="!hasPhotos" description="暂无现场照片" />

    <!-- 验收信息 -->
    <el-card class="mb-20" v-if="record.status !== 'scheduled' && record.status !== 'installing'">
      <template #header><span class="section-title">验收记录</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="内部验收">
          <el-tag v-if="record.status === 'internally_verified' || record.status === 'accepted'" type="success">通过</el-tag>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="验收日期">{{ record.internal_verified_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="甲方验收">
          <el-tag v-if="record.status === 'accepted'" type="success">通过</el-tag>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="验收日期">{{ record.client_verified_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 验收对话框 -->
    <el-dialog v-model="showVerifyDialog" title="施工验收" width="520px">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)

const record = ref({})
const workOrder = ref({})

const hasPhotos = computed(() => {
  return (record.value.before_photos?.length || 0) +
    (record.value.during_photos?.length || 0) +
    (record.value.after_photos?.length || 0) > 0
})

const STATUS_MAP = {
  scheduled: '待施工', installing: '施工中', completed: '已完成',
  internally_verified: '内部验收通过', accepted: '甲方已验收', rejected: '退回整改',
}
function statusLabel(s) { return STATUS_MAP[s] || s }
function statusType(s) {
  const map = { scheduled: 'info', installing: 'warning', completed: 'primary', internally_verified: 'success', accepted: 'success', rejected: 'danger' }
  return map[s] || ''
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
    await api.post(`/construction/${route.params.workOrderId}`, {
      notes: '施工中',
    })
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

onMounted(fetchDetail)
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-8 { margin-bottom: var(--space-2); }
.mb-20 { margin-bottom: var(--space-5); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
.photo-section { margin-bottom: var(--space-4); }
.photo-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); margin-bottom: var(--space-2); color: var(--color-text-secondary); }
.photo-grid { display: grid; grid-template-columns: repeat(5, 100px); gap: var(--space-2); }
.photo-item { width: 100px; height: 100px; border-radius: var(--radius-sm); cursor: pointer; }
</style>
