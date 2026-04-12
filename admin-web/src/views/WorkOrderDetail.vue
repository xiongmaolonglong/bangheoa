<template>
  <div v-loading="loading">
    <!-- Header -->
    <div class="flex-between mb-20">
      <div>
        <el-button @click="$router.back()" class="mb-8">&larr; 返回</el-button>
        <h1 class="page-title"><span class="wo-no">{{ detail.work_order_no }}</span> {{ detail.title }}</h1>
      </div>
      <div>
        <el-button>导出 PDF</el-button>
        <el-button type="primary">打印</el-button>
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
            <el-button v-if="detail.current_stage === 'measurement'" type="success" style="width:100%"
              @click="$router.push(`/work-orders/${id}/measure-review`)">审核测量数据</el-button>
            <el-button v-if="detail.current_stage === 'assignment'" type="primary" style="width:100%"
              @click="$router.push('/dispatch')">派单</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'

const route = useRoute()
const id = route.params.id
const loading = ref(true)
const detail = ref({})
const logs = ref([])

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

onMounted(async () => {
  try {
    const [woRes, logRes] = await Promise.all([
      api.get(`/work-orders/${id}`),
      api.get(`/work-orders/${id}/logs`)
    ])
    detail.value = woRes.data || {}
    logs.value = logRes.data || []
  } catch {
    // Demo data
    detail.value = {
      id: 5, work_order_no: 'GG-2026-0005', title: '步步高 XX 超市招牌工程',
      client_name: '步步高商业连锁', project_type: '门头招牌', project_category: '日常',
      address: '长沙市岳麓区 XX 路 128 号', contact_name: '张经理', contact_phone: '138****1234',
      description: '制作超市门头招牌，含铝塑板包边和 LED 发光字',
      current_stage: 'measurement', assigned_to: '李四', deadline: '04-15', is_timeout: false,
      photos: [], measurement: {
        materials: [
          { type: '铝塑板', faces: [
            { label: '正面', width: 3, height: 1.2, area: 3.6, notes: '老板要加电话号码', photos: ['',''] },
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
    logs.value = [
      { id: 1, detail: '派单给 李四（测量员），截止 04-15', user_name: '王五', created_at: '04-12 14:30' },
      { id: 2, detail: '甲方审批通过', user_name: '张经理', created_at: '04-11 16:00' },
      { id: 3, detail: '刘八提交了申报', user_name: '刘八', created_at: '04-11 09:00' },
      { id: 4, detail: '工单创建', user_name: '刘八', created_at: '04-10 10:00' }
    ]
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
.mt-16 { margin-top: 16px; }
.text-muted { color: #8c8c8c; font-size: 12px; }
.text-danger { color: #f5222d; }
.action-link { color: #1890ff; cursor: pointer; }
.photo-grid { display: grid; grid-template-columns: repeat(5, 80px); gap: 8px; }
.photo-item { width: 80px; height: 80px; border-radius: 6px; cursor: pointer; }
.current-stage-box { text-align: center; padding: 16px; }
.stage-icon { font-size: 32px; margin-bottom: 8px; }
.stage-name { font-size: 15px; font-weight: 600; }
.material-section { border: 1px solid #e8e8e8; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.mat-header { background: #fafafa; padding: 10px 16px; font-weight: 500; font-size: 13px; }
.mat-body { padding: 0 16px; }
.face-row { display: grid; grid-template-columns: 60px 120px 80px 1fr 50px; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
.face-row:last-child { border-bottom: none; }
.face-label { color: #8c8c8c; }
.face-area { color: #1890ff; font-weight: 500; }
.action-buttons { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
</style>
