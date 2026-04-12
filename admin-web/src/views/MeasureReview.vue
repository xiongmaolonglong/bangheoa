<template>
  <div v-loading="loading">
    <div class="flex-between mb-20">
      <div>
        <el-button @click="$router.back()" class="mb-8">&larr; 返回工单详情</el-button>
        <h1 class="page-title">测量数据审核 <span class="wo-no">{{ data.work_order_no }}</span></h1>
      </div>
      <div>
        <el-button type="danger" @click="handleReject">&#10007; 驳回重测</el-button>
        <el-button type="success" @click="handleApprove">&#10003; 审核通过</el-button>
      </div>
    </div>

    <!-- Environment -->
    <el-card class="mb-20">
      <template #header><span class="section-title">测量环境</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="天气">{{ env.weather || '—' }}</el-descriptions-item>
        <el-descriptions-item label="现场通道">{{ env.access || '—' }}</el-descriptions-item>
        <el-descriptions-item label="车辆可达">
          <el-tag :type="env.vehicle_access ? 'success' : 'danger'">{{ env.vehicle_access ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="环境标记">
          <el-tag v-for="flag in env.environment_flags" :key="flag" size="small" type="warning" class="mr-4">{{ flag }}</el-tag>
          <span v-if="!env.environment_flags?.length" class="text-muted">无</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ env.notes || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Materials -->
    <el-card class="mb-20">
      <template #header><span class="section-title">材料测量数据</span></template>
      <div v-for="(mat, mi) in materials" :key="mi" class="material-section">
        <div class="mat-header">
          <span>{{ mat.type }} — {{ mat.faces.length }}面 &nbsp;
            <el-tag size="small" type="primary">合计 {{ totalArea(mat.faces) }}㎡</el-tag>
          </span>
        </div>
        <div class="mat-body">
          <div class="face-header">
            <span>面位</span><span>宽度(m)</span><span>高度(m)</span><span>面积(㎡)</span><span>备注</span><span>照片</span>
          </div>
          <div class="face-row" v-for="(face, fi) in mat.faces" :key="fi">
            <span class="face-label">{{ face.label }}</span>
            <span>{{ face.width?.toFixed(2) }}</span>
            <span>{{ face.height?.toFixed(2) }}</span>
            <span class="face-area">{{ face.area || (face.width * face.height).toFixed(2) }}㎡</span>
            <span>
              <el-tag v-if="face.special_flag" size="small" type="warning">特殊</el-tag>
              {{ face.notes || '' }}
            </span>
            <span class="action-link">{{ face.photos?.length || 0 }}张</span>
          </div>
        </div>
      </div>

      <div class="total-bar">
        <span class="total-label">总面积合计</span>
        <span class="total-value">{{ grandTotal }}㎡</span>
      </div>
    </el-card>

    <!-- Signature + Sketch -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header><span class="section-title">客户签名</span></template>
          <div class="sig-placeholder">
            <el-image v-if="data.signature_path" :src="data.signature_path" fit="contain" style="max-height:120px" />
            <span v-else class="text-muted">暂无签名</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span class="section-title">现场草图</span></template>
          <div class="sig-placeholder">
            <el-image v-if="data.sketch_path" :src="data.sketch_path" fit="contain" style="max-height:120px" />
            <span v-else class="text-muted">暂无草图</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Reject Dialog -->
    <el-dialog v-model="showReject" title="驳回重测" width="480px">
      <el-form>
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReject = false">取消</el-button>
        <el-button type="danger" @click="submitReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const showReject = ref(false)
const rejectReason = ref('')

const data = ref({})
const env = ref({})
const materials = ref([])

const grandTotal = computed(() => {
  return materials.value.reduce((sum, mat) => {
    return sum + mat.faces.reduce((s, f) => s + (f.area || (f.width * f.height)), 0)
  }, 0).toFixed(2)
})

function totalArea(faces) {
  return faces.reduce((s, f) => s + (f.area || (f.width * f.height)), 0).toFixed(2)
}

async function handleApprove() {
  try {
    await ElMessageBox.confirm('确认审核通过该测量数据？', '提示', { type: 'warning' })
    await api.post(`/measurements/${route.params.id}/review`, { action: 'approve' })
    ElMessage.success('审核通过，工单已进入设计环节')
    router.back()
  } catch {}
}

async function submitReject() {
  if (!rejectReason.value) return ElMessage.warning('请填写驳回原因')
  try {
    await api.post(`/measurements/${route.params.id}/review`, { action: 'reject', reason: rejectReason.value })
    ElMessage.success('已驳回，通知测量员重测')
    showReject.value = false
    router.back()
  } catch {}
}

onMounted(async () => {
  try {
    const res = await api.get(`/work-orders/${route.params.id}`)
    const d = res.data || {}
    data.value = d
    env.value = d.measurement?.basic_info || {}
    materials.value = d.measurement?.materials || []
  } catch {
    // Demo data
    data.value = {
      work_order_no: 'GG-2026-0005',
      measurement: {
        basic_info: {
          weather: '晴', access: '畅通', vehicle_access: true,
          environment_flags: ['高空作业(约3m)', '电源可用'],
          notes: '现场通道正常，施工车辆可直达门口'
        },
        materials: [
          { type: '铝塑板', faces: [
            { label: '正面', width: 3, height: 1.2, area: 3.6, notes: '老板要加电话号码', special_flag: true, photos: ['',''] },
            { label: '侧面1', width: 0.5, height: 1.2, area: 0.6, photos: [''] },
            { label: '侧面2', width: 0.5, height: 1.2, area: 0.6, photos: [''] },
            { label: '底面', width: 3, height: 0.3, area: 0.9, photos: [''] }
          ]},
          { type: 'LED发光字', faces: [
            { label: '正面', width: 2, height: 0.8, area: 1.6, photos: [''] },
            { label: '侧面', width: 0.3, height: 0.8, area: 0.24, photos: [''] }
          ]}
        ]
      }
    }
    env.value = data.value.measurement.basic_info
    materials.value = data.value.measurement.materials
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.wo-no { color: #1890ff; font-family: monospace; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.mb-8 { margin-bottom: 8px; }
.mb-20 { margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 600; }
.text-muted { color: #d9d9d9; font-size: 13px; }
.action-link { color: #1890ff; cursor: pointer; }
.mr-4 { margin-right: 4px; }
.material-section { border: 1px solid #e8e8e8; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.mat-header { background: #fafafa; padding: 10px 16px; font-weight: 500; font-size: 13px; }
.mat-body { padding: 0 16px; }
.face-header { display: grid; grid-template-columns: 80px 100px 100px 100px 1fr 60px; gap: 8px; padding: 10px 0 6px; font-size: 12px; color: #8c8c8c; border-bottom: 1px solid #e8e8e8; }
.face-row { display: grid; grid-template-columns: 80px 100px 100px 100px 1fr 60px; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; align-items: center; }
.face-row:last-child { border-bottom: none; }
.face-label { color: #8c8c8c; }
.face-area { color: #1890ff; font-weight: 500; }
.total-bar { margin-top: 16px; padding: 12px 16px; background: #f5f7fa; border-radius: 6px; display: flex; justify-content: space-between; }
.total-label { font-weight: 500; }
.total-value { font-size: 18px; font-weight: 600; color: #1890ff; }
.sig-placeholder { text-align: center; padding: 20px; min-height: 120px; display: flex; align-items: center; justify-content: center; }
</style>
