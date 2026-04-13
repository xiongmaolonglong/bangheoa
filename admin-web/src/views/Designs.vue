<template>
  <div>
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">设计管理</h1>
        <p class="page-desc">管理设计稿上传与审核</p>
      </div>
      <el-button @click="fetchData" :icon="Refresh" circle title="刷新" />
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="mb-20">
      <el-col :span="6" v-for="stat in statCards" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-body">
            <div class="stat-number" :style="{ color: stat.color }">{{ stat.count }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="待设计" name="designing">
        <el-table :data="designList" stripe v-loading="loading" @row-click="handleRowClick">
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column label="测量面积" width="100">
            <template #default="{ row }">{{ calcArea(row) }}㎡</template>
          </el-table-column>
          <el-table-column label="材料类型" width="120">
            <template #default="{ row }">
              <span class="text-muted">{{ getMaterialTypes(row) || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="设计次数" width="100">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.design_count || 0 }} 次</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click.stop="openDesign(row)">上传设计</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !designList.length" description="暂无待设计工单" />
      </el-tab-pane>

      <el-tab-pane label="待审核" name="reviewing">
        <el-table :data="reviewList" stripe v-loading="loading">
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column prop="submitted_at" label="提交时间" width="160" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" type="warning">待审核</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="handleReview(row, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="handleReview(row, 'reject')">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !reviewList.length" description="暂无待审核设计" />
      </el-tab-pane>

      <el-tab-pane label="已完成" name="completed">
        <el-table :data="completedList" stripe v-loading="loading">
          <el-table-column prop="work_order_no" label="工单号" width="160">
            <template #default="{ row }">
              <router-link :to="`/work-orders/${row.id}`" class="wo-link">{{ row.work_order_no }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="项目名称" min-width="150" />
          <el-table-column label="设计版本" width="100">
            <template #default="{ row }">v{{ row.design_count || 1 }}</template>
          </el-table-column>
          <el-table-column prop="created_at" label="完成时间" width="160" />
        </el-table>
        <el-empty v-if="!loading && !completedList.length" description="暂无已完成设计" />
      </el-tab-pane>
    </el-tabs>

    <!-- 上传设计对话框 -->
    <el-dialog v-model="showDesignDialog" title="上传设计稿" width="560px">
      <el-form label-width="80px">
        <el-form-item label="工单">
          <span class="wo-link">{{ currentWO.work_order_no }}</span>
          <span class="ml-8 text-muted">{{ currentWO.title }}</span>
        </el-form-item>
        <el-form-item label="效果图">
          <el-input v-model="designForm.effect_urls" placeholder="请输入效果图URL，多个用逗号分隔" />
          <div class="text-muted mt-4">也可粘贴多张图片URL，每行一个或用逗号分隔</div>
        </el-form-item>
        <el-form-item label="设计说明">
          <el-input v-model="designForm.notes" type="textarea" :rows="3" placeholder="设计说明或备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDesignDialog = false">取消</el-button>
        <el-button type="primary" @click="submitDesign" :loading="submitting">上传</el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog v-model="showRejectDialog" title="驳回设计" width="480px">
      <el-descriptions :column="1" border class="mb-16">
        <el-descriptions-item label="工单号">{{ reviewingWO?.work_order_no }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ reviewingWO?.title }}</el-descriptions-item>
      </el-descriptions>
      <el-form>
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请详细说明驳回原因及修改要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="submitting">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 测量数据查看抽屉 -->
    <el-drawer v-model="showMeasureDrawer" title="测量数据参考" size="600px">
      <el-descriptions :column="2" border class="mb-16">
        <el-descriptions-item label="工单号">{{ measureWO.work_order_no }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ measureWO.title }}</el-descriptions-item>
        <el-descriptions-item label="总面积">{{ measureTotalArea }}㎡</el-descriptions-item>
        <el-descriptions-item label="测量员">{{ measureWO.measurements?.[0]?.measurer?.name || '—' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 各面尺寸可视化 -->
      <div v-if="measureFaces.length">
        <h4 class="section-title">各面尺寸对比</h4>
        <div class="face-grid">
          <div v-for="(face, i) in measureFaces" :key="i" class="face-card">
            <div class="face-title">{{ face.label || (i + 1) + '面' }}</div>
            <div class="face-dims">{{ face.width || 0 }}m × {{ face.height || 0 }}m</div>
            <div class="face-area">{{ (face.area || (face.width * face.height) || 0).toFixed(2) }}㎡</div>
            <div class="face-bar">
              <div class="face-bar-fill" :style="{ width: getBarWidth(face) + '%' }"></div>
            </div>
            <div v-if="face.notes" class="face-note">{{ face.notes }}</div>
          </div>
        </div>
      </div>

      <!-- 材料分布 -->
      <div v-if="measureMaterials.length > 1">
        <h4 class="section-title">材料分布</h4>
        <div class="material-bar">
          <div v-for="(mat, i) in measureMaterials" :key="i"
            class="material-segment"
            :style="{ width: getMaterialWidth(mat) + '%', backgroundColor: materialColors[i % materialColors.length] }">
            {{ mat.type }} {{ mat.faces.length }}面
          </div>
        </div>
      </div>

      <!-- 设计版本对比（如果有历史设计） -->
      <div v-if="measureWO.designs?.length > 1">
        <h4 class="section-title">设计版本历史</h4>
        <div class="version-list">
          <div v-for="(d, i) in measureWO.designs" :key="i" class="version-item">
            <span class="version-tag">v{{ i + 1 }}</span>
            <span class="version-date">{{ d.created_at || d.submitted_at || '—' }}</span>
            <el-tag size="small" :type="d.status === 'approved' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'">
              {{ d.status === 'approved' ? '通过' : d.status === 'rejected' ? '驳回' : '待审' }}
            </el-tag>
            <span class="version-type">{{ d.design_type || '—' }}</span>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import api from '../api'

const activeTab = ref('designing')
const designList = ref([])
const reviewList = ref([])
const completedList = ref([])
const loading = ref(false)
const submitting = ref(false)

const statCards = reactive([])

function calcArea(row) {
  if (row.measurements?.length) {
    return row.measurements.reduce((sum, m) => sum + (m.area || 0), 0).toFixed(2)
  }
  return '0.00'
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get('/designs/tasks')
    const allDesigns = res.data || []
    designList.value = allDesigns.filter(w => w.status === 'designing' || w.current_stage === 'design')
    completedList.value = allDesigns.filter(w => w.status === 'design_complete' || w.design_count > 0)
  } catch {
    designList.value = []
    completedList.value = []
  }
  try {
    const res2 = await api.get('/work-orders', { params: { stage: 'design', status: 'designing' } })
    reviewList.value = (res2.data?.list || res2.data || []).map(w => ({
      ...w,
      submitted_at: w.created_at?.slice(0, 10),
    }))
  } catch {
    reviewList.value = []
  }
  // 统计
  statCards.length = 0
  statCards.push(
    { label: '待设计', count: designList.value.length, color: '#e6a23c' },
    { label: '待审核', count: reviewList.value.length, color: '#409eff' },
    { label: '已完成', count: completedList.value.length, color: '#67c23a' },
    { label: '总设计次数', count: completedList.value.reduce((s, r) => s + (r.design_count || 0), 0), color: '#9333ea' },
  )
  loading.value = false
}

// 上传设计
const showDesignDialog = ref(false)
const currentWO = reactive({ id: '', work_order_no: '', title: '' })
const designForm = reactive({ effect_urls: '', notes: '' })

function openDesign(row) {
  currentWO.id = row.id
  currentWO.work_order_no = row.work_order_no
  currentWO.title = row.title
  designForm.effect_urls = ''
  designForm.notes = ''
  showDesignDialog.value = true
}

async function submitDesign() {
  if (!designForm.effect_urls) return ElMessage.warning('请至少填写一个效果图URL')
  submitting.value = true
  try {
    const urls = designForm.effect_urls.split(/[,\n]/).map(u => u.trim()).filter(Boolean)
    await api.post(`/designs/${currentWO.id}`, { effect_images: urls, internal_notes: designForm.notes })
    ElMessage.success('设计稿上传成功')
    showDesignDialog.value = false
    await fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '上传失败')
  } finally {
    submitting.value = false
  }
}

// 审核
const showRejectDialog = ref(false)
const rejectReason = ref('')
const reviewingWO = ref(null)

function handleReview(row, action) {
  if (action === 'reject') {
    reviewingWO.value = row
    rejectReason.value = ''
    showRejectDialog.value = true
  } else {
    confirmApprove(row)
  }
}

async function confirmApprove(row) {
  submitting.value = true
  try {
    await api.post(`/designs/${row.id}/review`, { action: 'approve' })
    ElMessage.success('审核通过')
    await fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '审核失败')
  } finally {
    submitting.value = false
  }
}

async function confirmReject() {
  if (!rejectReason.value) return ElMessage.warning('请填写驳回原因')
  submitting.value = true
  try {
    await api.post(`/designs/${reviewingWO.value.id}/review`, { action: 'reject', comment: rejectReason.value })
    ElMessage.success('已驳回')
    showRejectDialog.value = false
    await fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '驳回失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchData)

// 测量数据可视化
const showMeasureDrawer = ref(false)
const measureWO = reactive({ id: '', work_order_no: '', title: '', designs: [], measurements: [] })
const measureFaces = ref([])
const measureMaterials = ref([])

const measureTotalArea = computed(() => {
  return measureFaces.value.reduce((s, f) => s + (f.area || (f.width * f.height) || 0), 0).toFixed(2)
})

const materialColors = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2']

function handleRowClick(row) {
  openMeasureView(row)
}

function openMeasureView(row) {
  if (!row.measurements?.length) return
  Object.assign(measureWO, {
    id: row.id, work_order_no: row.work_order_no, title: row.title,
    designs: row.designs || [], measurements: row.measurements
  })
  // 收集所有面
  const allFaces = []
  const allMats = []
  for (const m of (row.measurements[0]?.materials || [])) {
    allMats.push(m)
    for (const f of (m.faces || [])) {
      allFaces.push({ ...f, materialType: m.type })
    }
  }
  measureFaces.value = allFaces
  measureMaterials.value = allMats
  showMeasureDrawer.value = true
}

function getBarWidth(face) {
  const maxArea = Math.max(...measureFaces.value.map(f => f.area || (f.width * f.height) || 0), 1)
  return ((face.area || (face.width * face.height) || 0) / maxArea * 100).toFixed(0)
}

function getMaterialWidth(mat) {
  const totalFaces = measureMaterials.value.reduce((s, m) => s + m.faces.length, 0) || 1
  return (mat.faces.length / totalFaces * 100).toFixed(0)
}

function getMaterialTypes(row) {
  if (!row.measurements?.length) return ''
  const mats = row.measurements[0]?.materials || []
  return mats.map(m => m.type).join('、')
}
</script>

<style scoped>
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.page-header { margin-bottom: var(--space-6); }
.page-desc { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.mb-16 { margin-bottom: var(--space-4); }
.mb-20 { margin-bottom: var(--space-5); }
.mt-4 { margin-top: var(--space-1); }
.ml-8 { margin-left: var(--space-2); }
.stat-card .stat-body { text-align: center; padding: var(--space-2) 0; }
.stat-number { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-sm); margin-top: var(--space-1); }
.text-muted { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.wo-link { color: var(--color-primary); text-decoration: none; }
.wo-link:hover { text-decoration: underline; }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); margin: 16px 0 12px; }
.face-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.face-card { background: var(--color-bg-page); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 12px; }
.face-title { font-weight: var(--font-weight-medium); font-size: var(--font-size-sm); margin-bottom: 4px; }
.face-dims { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.face-area { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--color-primary); margin: 4px 0; }
.face-bar { height: 6px; background: var(--color-border-light); border-radius: 3px; overflow: hidden; }
.face-bar-fill { height: 100%; background: var(--color-primary); border-radius: 3px; transition: width 0.3s; }
.face-note { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 4px; }
.material-bar { display: flex; height: 32px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 8px; }
.material-segment { display: flex; align-items: center; justify-content: center; color: #fff; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); min-width: 60px; }
.version-list { display: flex; flex-direction: column; gap: 8px; }
.version-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--color-bg-page); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
.version-tag { font-weight: var(--font-weight-semibold); color: var(--color-primary); }
.version-date { color: var(--color-text-tertiary); }
.version-type { margin-left: auto; color: var(--color-text-secondary); }
</style>
