<template>
  <div class="archive-detail-page" v-loading="loading">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <el-button text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <el-divider direction="vertical" />
        <span class="order-no">{{ order?.order_no }}</span>
        <el-tag type="success" size="large" effect="dark">已归档</el-tag>
        <span class="archived-since">归档于 {{ order?.archived_at ? formatDate(order.archived_at) : '-' }}</span>
      </div>
      <div class="status-right">
        <el-button @click="handlePrint">
          <el-icon><Printer /></el-icon> 打印报告
        </el-button>
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon> 导出报告
        </el-button>
      </div>
    </div>

    <!-- 订单概要横条 -->
    <div class="summary-bar">
      <div class="summary-item">
        <span class="summary-label">客户</span>
        <span class="summary-value">{{ order?.customer?.real_name || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">店铺</span>
        <span class="summary-value">{{ order?.form_data?.company || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">地址</span>
        <span class="summary-value">{{ order?.form_data?.address || '-' }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">总面积</span>
        <span class="summary-value highlight">{{ totalArea }}㎡</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">总耗时</span>
        <span class="summary-value">{{ durationText }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-label">归档日期</span>
        <span class="summary-value">{{ order?.archived_at ? formatDate(order.archived_at) : '-' }}</span>
      </div>
    </div>

    <!-- 流程时间线 -->
    <div class="card flow-timeline-card">
      <div class="card-header">
        <el-icon><Timer /></el-icon>
        全流程记录
      </div>
      <div class="card-body">
        <div class="flow-steps-horizontal">
          <div
            v-for="(step, idx) in fullFlowSteps"
            :key="idx"
            class="flow-step-item"
            :class="{ completed: step.completed, current: step.current, pending: !step.completed && !step.current }"
          >
            <div class="step-node">
              <el-icon v-if="step.completed"><Check /></el-icon>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="step-label">{{ step.label }}</div>
            <div class="step-time" v-if="step.completed">{{ step.time }}</div>
            <div class="step-person" v-if="step.completed && step.person">{{ step.person }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-grid">
      <!-- 左侧：订单信息 + 操作日志 -->
      <div class="left-panel">
        <div class="card info-card">
          <div class="card-header">
            <el-icon><Document /></el-icon>
            订单信息
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-row">
                <span class="info-label">订单编号</span>
                <span class="info-value mono">{{ order?.order_no }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">店铺名称</span>
                <span class="info-value">{{ order?.form_data?.company || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">客户姓名</span>
                <span class="info-value">{{ order?.customer?.real_name || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">联系电话</span>
                <span class="info-value mono">{{ order?.customer?.phone || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">安装地址</span>
                <span class="info-value">{{ order?.form_data?.address || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">需求说明</span>
                <span class="info-value">{{ order?.requirement || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">负责分区</span>
                <span class="info-value">{{ regionText }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">安装员</span>
                <span class="info-value">{{ order?.handler?.real_name || '-' }}</span>
              </div>
              <div class="info-row full-width">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ order?.created_at ? formatDate(order.created_at) : '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作日志 -->
        <div class="card log-card">
          <div class="card-header">
            <el-icon><List /></el-icon>
            操作日志
            <span class="badge">{{ logs.length }}</span>
          </div>
          <div class="card-body">
            <div class="timeline">
              <div v-for="(log, i) in logs" :key="log.id" class="timeline-item">
                <div class="timeline-dot" :class="{ latest: i === 0 }"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-user">{{ log.operator?.real_name || '系统' }}</span>
                    <span class="timeline-action">{{ getActionText(log.action) }}</span>
                  </div>
                  <div class="timeline-remark" v-if="log.remark">{{ log.remark }}</div>
                  <div class="timeline-time">{{ formatDate(log.created_at) }}</div>
                </div>
              </div>
              <el-empty v-if="logs.length === 0" description="暂无记录" :image-size="60" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详细内容标签页 -->
      <div class="right-panel">
        <div class="card tabs-card">
          <div class="card-body no-padding">
            <el-tabs v-model="activeTab" class="detail-tabs">
              <!-- 广告项目 -->
              <el-tab-pane label="广告项目" name="items">
                <template #label>
                  <span><el-icon><Grid /></el-icon> 广告项目</span>
                </template>
                <div class="tab-content">
                  <div v-for="(group, gIdx) in groupedFaces" :key="gIdx" class="face-group">
                    <div class="face-group-header">
                      <span class="group-icon" :class="'type-' + ((gIdx % 3) + 1)">
                        <el-icon><Component :is="group.icon" /></el-icon>
                      </span>
                      <span class="group-name">{{ group.adTypeName }}</span>
                      <span class="group-meta">{{ group.faces.length }}面 · {{ group.faces.reduce((s, f) => s + (f.width * f.height) / 10000, 0).toFixed(2) }}㎡</span>
                    </div>
                    <div class="face-list">
                      <div v-for="face in group.faces" :key="face.id" class="face-item">
                        <div class="face-info">
                          <div class="face-name">{{ face.face_name }}</div>
                          <div class="face-spec">{{ face.width }}×{{ face.height }}cm · {{ ((face.width * face.height) / 10000).toFixed(2) }}㎡</div>
                          <div class="face-material" v-if="face.material">{{ face.material.name }}</div>
                        </div>
                        <div class="face-photos">
                          <div v-for="(photo, pIdx) in parsePhotos(face.photos).slice(0, 3)" :key="pIdx" class="face-photo" @click="previewPhotos(allFacePhotos)">
                            <el-image :src="getPhotoUrl(photo)" fit="cover" class="face-photo-img" :preview-src-list="allFacePhotos.map(getPhotoUrl)" :preview-teleported="true" lazy />
                          </div>
                          <span v-if="!parsePhotos(face.photos).length" class="no-photo">无照片</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <el-empty v-if="allFaces.length === 0" description="暂无广告项目" :image-size="60" />
                </div>
              </el-tab-pane>

              <!-- 设计方案 -->
              <el-tab-pane label="设计方案" name="design">
                <template #label>
                  <span><el-icon><EditPen /></el-icon> 设计方案</span>
                </template>
                <div class="tab-content">
                  <div v-if="order?.designScheme" class="design-info">
                    <div class="design-meta">
                      <div class="meta-row">
                        <span class="meta-label">设计师</span>
                        <span class="meta-value">{{ order.designScheme.designer?.real_name || '-' }}</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-label">设计时间</span>
                        <span class="meta-value">{{ formatDate(order.designScheme.created_at) }}</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-label">方案说明</span>
                        <span class="meta-value">{{ order.designScheme.description || '-' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="drawings-grid" v-if="designDrawings.length">
                    <div v-for="(img, index) in designDrawings" :key="index" class="drawing-item" @click="previewDesign(img)">
                      <el-image :src="getPhotoUrl(img.file_url)" fit="cover" class="drawing-img" lazy />
                      <div class="drawing-label">{{ img.group?.group_name || '设计图' }}</div>
                    </div>
                  </div>
                  <el-empty v-if="!designDrawings.length" description="暂无设计方案" :image-size="60" />
                </div>
              </el-tab-pane>

              <!-- 安装报告 -->
              <el-tab-pane label="安装报告" name="install">
                <template #label>
                  <span><el-icon><Finished /></el-icon> 安装报告</span>
                </template>
                <div class="tab-content">
                  <div v-if="installReport" class="report-content">
                    <div class="report-meta">
                      <div class="meta-item">
                        <span class="meta-label">安装员</span>
                        <span class="meta-value">{{ installReport.installer?.real_name || '-' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">安装日期</span>
                        <span class="meta-value">{{ installReport.install_date ? formatDate(installReport.install_date) : '-' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">满意度</span>
                        <el-tag v-if="installReport.customer_satisfaction === 'satisfied'" type="success" size="small">满意</el-tag>
                        <el-tag v-else-if="installReport.customer_satisfaction === 'basic'" type="warning" size="small">基本满意</el-tag>
                        <el-tag v-else-if="installReport.customer_satisfaction === 'unsatisfied'" type="danger" size="small">不满意</el-tag>
                        <span v-else>-</span>
                      </div>
                      <div class="meta-item" v-if="installReport.customer_sign">
                        <span class="meta-label">客户签字</span>
                        <el-image :src="getPhotoUrl(installReport.customer_sign)" style="width:150px;height:70px;cursor:pointer;" :preview-src-list="[getPhotoUrl(installReport.customer_sign)]" :preview-teleported="true" fit="contain" lazy />
                      </div>
                    </div>

                    <div class="photo-block" v-if="installReport.before_photos?.length">
                      <div class="photo-block-title"><span class="dot before"></span> 安装前</div>
                      <div class="photo-grid">
                        <div v-for="(url, i) in installReport.before_photos" :key="i" class="photo-thumb" @click="previewAllPhotos([...(installReport.before_photos || []), ...(installReport.after_photos || [])])">
                          <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-thumb-img" lazy />
                        </div>
                      </div>
                    </div>

                    <div class="photo-block" v-if="installReport.after_photos?.length">
                      <div class="photo-block-title"><span class="dot after"></span> 安装后</div>
                      <div class="photo-grid">
                        <div v-for="(url, i) in installReport.after_photos" :key="i" class="photo-thumb" @click="previewAllPhotos([...(installReport.before_photos || []), ...(installReport.after_photos || [])])">
                          <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-thumb-img" lazy />
                        </div>
                      </div>
                    </div>

                    <div class="photo-block" v-if="installReport.overall_photos?.length">
                      <div class="photo-block-title"><span class="dot overall"></span> 整体效果</div>
                      <div class="photo-grid">
                        <div v-for="(url, i) in installReport.overall_photos" :key="i" class="photo-thumb" @click="previewAllPhotos(installReport.overall_photos)">
                          <el-image :src="getPhotoUrl(url)" fit="cover" class="photo-thumb-img" lazy />
                        </div>
                      </div>
                    </div>

                    <div class="issue-box" v-if="installReport.has_issue">
                      <strong>遗留问题：</strong>{{ installReport.issue_desc }}
                    </div>

                    <div v-if="installReport.remark" class="report-remark">
                      <strong>备注：</strong>{{ installReport.remark }}
                    </div>
                  </div>
                  <el-empty v-else description="暂无安装报告" :image-size="60" />
                </div>
              </el-tab-pane>

              <!-- 数据汇总 -->
              <el-tab-pane label="数据汇总" name="summary">
                <template #label>
                  <span><el-icon><DataAnalysis /></el-icon> 数据汇总</span>
                </template>
                <div class="tab-content">
                  <div class="summary-grid">
                    <div class="summary-stat">
                      <div class="stat-icon blue"><el-icon><Monitor /></el-icon></div>
                      <div class="stat-body">
                        <div class="stat-value">{{ allFaces.length }}</div>
                        <div class="stat-label">测量面数</div>
                      </div>
                    </div>
                    <div class="summary-stat">
                      <div class="stat-icon green"><el-icon><ScaleToOriginal /></el-icon></div>
                      <div class="stat-body">
                        <div class="stat-value">{{ totalArea }}㎡</div>
                        <div class="stat-label">总面积</div>
                      </div>
                    </div>
                    <div class="summary-stat">
                      <div class="stat-icon orange"><el-icon><Calendar /></el-icon></div>
                      <div class="stat-body">
                        <div class="stat-value">{{ durationText }}</div>
                        <div class="stat-label">总耗时</div>
                      </div>
                    </div>
                    <div class="summary-stat">
                      <div class="stat-icon purple"><el-icon><Document /></el-icon></div>
                      <div class="stat-body">
                        <div class="stat-value">{{ designDrawings.length }}</div>
                        <div class="stat-label">设计图数量</div>
                      </div>
                    </div>
                  </div>

                  <div class="ad-type-breakdown">
                    <h4 class="breakdown-title">按广告类型统计</h4>
                    <div v-for="group in groupedFaces" :key="group.adTypeName" class="breakdown-row">
                      <div class="breakdown-label">{{ group.adTypeName }}</div>
                      <div class="breakdown-bar-wrap">
                        <div class="breakdown-bar" :style="{ width: (group.totalArea / totalAreaNum * 100) + '%' }"></div>
                      </div>
                      <div class="breakdown-value">{{ group.faces.length }}面 · {{ group.totalArea.toFixed(2) }}㎡</div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <el-image-viewer v-if="previewVisible" :url-list="previewUrls" @close="previewVisible = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Document, Clock, List, EditPen, Finished, Download, Printer,
  Timer, Check, Grid, DataAnalysis, Monitor, ScaleToOriginal, Calendar,
  Shop, Picture, Lightning, Collection
} from '@element-plus/icons-vue'
import { orderApi, installApi } from '@/api'
import dayjs from 'dayjs'
import { formatDate } from '@/composables/useFormat'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const activeTab = ref('items')

const order = ref({})
const logs = ref([])
const installReport = ref(null)
const previewVisible = ref(false)
const previewUrls = ref([])

// Mock 数据
const MOCK_ORDER = {
  id: 11,
  order_no: 'GD-DL-01-2604-0011',
  requirement: '需要安装门头LED发光字及两侧灯箱广告，要求夜间亮灯效果良好',
  handler: { real_name: '李师傅' },
  customer: { real_name: '张总', phone: '138****5678' },
  group: {
    name: '01组',
    district: { name: '大沥区', province: { name: '广东省' } }
  },
  form_data: { company: '广佛智城', address: '佛山市南海区大沥镇黄岐广佛智城A座一楼' },
  created_at: '2026-04-01T09:00:00',
  archived_at: '2026-04-10T18:00:00',
  adItems: [
    {
      adType: { name: '门头招牌' },
      faces: [
        { id: 1, face_name: '门头正面', width: 600, height: 80, material: { name: 'LED模组' }, photos: JSON.stringify(['https://picsum.photos/seed/face1a/300/200', 'https://picsum.photos/seed/face1b/300/200']) },
        { id: 2, face_name: '门头侧面', width: 120, height: 80, material: { name: 'LED模组' }, photos: JSON.stringify(['https://picsum.photos/seed/face2/300/200']) }
      ]
    },
    {
      adType: { name: '灯箱广告' },
      faces: [
        { id: 3, face_name: '左侧灯箱', width: 300, height: 150, material: { name: '超薄灯箱' }, photos: JSON.stringify(['https://picsum.photos/seed/face3a/300/200']) },
        { id: 4, face_name: '右侧灯箱', width: 300, height: 150, material: { name: '超薄灯箱' }, photos: JSON.stringify(['https://picsum.photos/seed/face4/300/200']) }
      ]
    },
    {
      adType: { name: '发光字' },
      faces: [
        { id: 5, face_name: '品牌LOGO字', width: 200, height: 120, material: { name: '不锈钢发光字' }, photos: JSON.stringify(['https://picsum.photos/seed/face5/300/200']) }
      ]
    }
  ],
  designScheme: {
    designer: { real_name: '王设计' },
    created_at: '2026-04-04T15:00:00',
    description: '现代简约风格，夜间LED发光效果',
    groups: [
      { id: 1, group_name: '门头LED方案', drawings: [{ id: 1, file_url: 'https://picsum.photos/seed/design1/500/350', group: { group_name: '门头LED方案' } }] },
      { id: 2, group_name: '侧墙灯箱方案', drawings: [{ id: 2, file_url: 'https://picsum.photos/seed/design2/500/350', group: { group_name: '侧墙灯箱方案' } }] }
    ]
  },
  installReport: {
    installer: { real_name: '李师傅' },
    install_date: '2026-04-10T14:00:00',
    customer_satisfaction: 'satisfied',
    customer_sign: 'https://picsum.photos/seed/sign/400/150',
    before_photos: ['https://picsum.photos/seed/before1/400/250', 'https://picsum.photos/seed/before2/400/250'],
    after_photos: ['https://picsum.photos/seed/after1/400/250', 'https://picsum.photos/seed/after2/400/250', 'https://picsum.photos/seed/after3/400/250', 'https://picsum.photos/seed/after4/400/250'],
    overall_photos: ['https://picsum.photos/seed/overall1/400/250', 'https://picsum.photos/seed/overall2/400/250'],
    has_issue: false,
    issue_desc: '',
    remark: '安装过程顺利，客户对夜间亮灯效果非常满意。'
  }
}

const MOCK_LOGS = [
  { id: 12, action: 'archive', operator: { real_name: '系统' }, remark: '订单归档完成', created_at: '2026-04-10T18:00:00' },
  { id: 11, action: 'install_approve', operator: { real_name: '王主管' }, remark: '安装质量合格，审核通过', created_at: '2026-04-10T17:00:00' },
  { id: 10, action: 'install_submit', operator: { real_name: '李师傅' }, remark: '提交安装报告', created_at: '2026-04-10T16:30:00' },
  { id: 9, action: 'install_start', operator: { real_name: '李师傅' }, remark: '开始安装', created_at: '2026-04-10T09:00:00' },
  { id: 8, action: 'check_complete', operator: { real_name: '赵核对员' }, remark: '物料核对通过', created_at: '2026-04-09T16:00:00' },
  { id: 7, action: 'production_complete', operator: { real_name: '孙生产员' }, remark: '生产完成', created_at: '2026-04-08T17:00:00' },
  { id: 6, action: 'design_approve', operator: { real_name: '王主管' }, remark: '设计方案审核通过', created_at: '2026-04-05T10:00:00' },
  { id: 5, action: 'design_submit', operator: { real_name: '王设计' }, remark: '提交设计方案', created_at: '2026-04-04T15:00:00' },
  { id: 4, action: 'measure_approve', operator: { real_name: '王主管' }, remark: '测量数据审核通过', created_at: '2026-04-03T11:00:00' },
  { id: 3, action: 'measure_submit', operator: { real_name: '陈测量员' }, remark: '提交测量报告', created_at: '2026-04-02T16:00:00' },
  { id: 2, action: 'measure_start', operator: { real_name: '陈测量员' }, remark: '开始测量', created_at: '2026-04-02T09:00:00' },
  { id: 1, action: 'create', operator: { real_name: '系统' }, remark: '订单创建', created_at: '2026-04-01T09:00:00' }
]

const fullFlowSteps = computed(() => {
  const steps = [
    { label: '测量申请', time: '04-01 09:00', person: '张总' },
    { label: '审核', time: '04-02 08:30', person: '王主管' },
    { label: '测量作业', time: '04-02 16:00', person: '陈测量员' },
    { label: '测量审核', time: '04-03 11:00', person: '王主管' },
    { label: '设计', time: '04-04 15:00', person: '王设计' },
    { label: '设计审核', time: '04-05 10:00', person: '王主管' },
    { label: '生产', time: '04-08 17:00', person: '孙生产员' },
    { label: '核对', time: '04-09 16:00', person: '赵核对员' },
    { label: '安装', time: '04-10 16:30', person: '李师傅' },
    { label: '安装审核', time: '04-10 17:00', person: '王主管' },
    { label: '归档', time: '04-10 18:00', person: '系统' }
  ]
  // All steps are completed for archived order
  return steps.map((s, i) => ({ ...s, completed: i <= 10, current: false }))
})

const allFaces = computed(() => {
  const faces = []
  order.value?.adItems?.forEach(item => {
    item.faces?.forEach(face => {
      faces.push({ ...face, ad_type_name: item.adType?.name, material: face.material })
    })
  })
  return faces
})

const groupedFaces = computed(() => {
  const groups = {}
  allFaces.value.forEach(face => {
    const typeName = face.ad_type_name || '未分类'
    if (!groups[typeName]) {
      groups[typeName] = { adTypeName: typeName, faces: [], totalArea: 0, icon: getIcon(typeName) }
    }
    groups[typeName].faces.push(face)
    groups[typeName].totalArea += (face.width * face.height) / 10000
  })
  return Object.values(groups)
})

const totalAreaNum = computed(() => {
  return allFaces.value.reduce((s, f) => s + (f.width * f.height) / 10000, 0)
})

const totalArea = computed(() => totalAreaNum.value.toFixed(2))

const durationText = computed(() => {
  if (!order.value?.created_at || !order.value?.archived_at) return '-'
  const days = dayjs(order.value.archived_at).diff(dayjs(order.value.created_at), 'day')
  return `${days}天`
})

const regionText = computed(() => {
  const g = order.value?.group
  if (!g) return '-'
  return [g.district?.province?.name, g.district?.name, g.name].filter(Boolean).join(' · ')
})

const designDrawings = computed(() => {
  const drawings = []
  order.value?.designScheme?.groups?.forEach(group => {
    group.drawings?.forEach(d => drawings.push({ ...d, group }))
  })
  return drawings
})

const allFacePhotos = computed(() => {
  const photos = []
  allFaces.value.forEach(face => {
    photos.push(...parsePhotos(face.photos))
  })
  return photos
})

const iconMap = { '门头招牌': Shop, '灯箱广告': Monitor, '发光字': Lightning, '背景墙': Picture, '默认': Collection }
const getIcon = (name) => iconMap[name] || iconMap['默认']

const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

const parsePhotos = (photos) => {
  if (!photos) return []
  if (Array.isArray(photos)) return photos
  try { return JSON.parse(photos) } catch { return [photos] }
}

const actionMap = {
  create: '创建订单', update: '更新订单', advance: '推进状态',
  approve: '审核通过', reject: '驳回', dispatch: '派单',
  design_submit: '提交设计', design_approve: '设计审核通过',
  measure_submit: '提交测量', measure_approve: '测量审核通过',
  measure_start: '开始测量', production_complete: '生产完成',
  check_complete: '核对通过', install_start: '开始安装',
  install_submit: '提交安装报告', install_approve: '安装审核通过',
  archive: '订单归档'
}
const getActionText = (action) => actionMap[action] || action

const previewPhotos = (urls) => {
  previewUrls.value = urls.filter(Boolean).map(getPhotoUrl)
  previewVisible.value = true
}

const previewAllPhotos = (urls) => {
  previewUrls.value = urls.filter(Boolean).map(getPhotoUrl)
  previewVisible.value = true
}

const previewDesign = (img) => {
  previewUrls.value = [getPhotoUrl(img.file_url)]
  previewVisible.value = true
}

const handleBack = () => router.push('/archive')
const handleExport = () => ElMessage.info('导出功能开发中')
const handlePrint = () => window.print()

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await orderApi.getDetail(route.params.id)
    order.value = res.data || {}
    logs.value = res.data?.logs || []
    try { const reportRes = await installApi.getReport(route.params.id); installReport.value = reportRes.data } catch (e) {}
  } catch (err) {
    order.value = MOCK_ORDER
    logs.value = MOCK_LOGS
    installReport.value = MOCK_ORDER.installReport
  }
  finally { loading.value = false }
}

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.archive-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ===== 顶部状态栏 ===== */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.status-left { display: flex; align-items: center; gap: 12px; }
.order-no { font-size: 16px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace; }
.archived-since { font-size: 12px; color: var(--text-secondary); }
.status-right { display: flex; gap: 8px; }

/* ===== 概要横条 ===== */
.summary-bar {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 0;
}
.summary-item { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.summary-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.summary-value { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.summary-value.highlight { color: var(--brand-primary); font-family: monospace; }
.summary-divider { width: 1px; height: 32px; background: var(--border); flex-shrink: 0; margin: 0 12px; }

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
.card-body.no-padding { padding: 0; }

/* ===== 流程时间线 ===== */
.flow-steps-horizontal {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 0 10px;
}
.flow-steps-horizontal::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 30px;
  right: 30px;
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.flow-step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  min-width: 80px;
}
.step-node {
  width: 36px;
  height: 36px;
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
.flow-step-item.completed .step-node {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.flow-step-item.current .step-node {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(99,102,241,0.2);
}
.step-label { font-size: 10px; color: var(--text-secondary); white-space: nowrap; font-weight: 500; }
.flow-step-item.completed .step-label { color: var(--brand-primary); font-weight: 600; }
.step-time { font-size: 9px; color: var(--text-secondary); }
.step-person { font-size: 9px; color: var(--text-secondary); font-style: italic; }

/* ===== 主内容网格 ===== */
.main-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
}

/* ===== 左侧面板 ===== */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 信息 */
.info-grid { display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; gap: 12px; }
.info-row.full-width { flex-direction: column; gap: 2px; }
.info-label { font-size: 12px; color: var(--text-secondary); min-width: 72px; flex-shrink: 0; }
.info-value { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.info-value.mono { font-family: monospace; }

/* 时间线 */
.timeline { padding: 4px 0; }
.timeline-item { position: relative; padding-left: 24px; padding-bottom: 16px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
}
.timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--border);
  border: 2px solid var(--card-bg);
}
.timeline-dot.latest { background: var(--brand-primary); }
.timeline-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.timeline-user { font-weight: 600; color: var(--text-primary); font-size: 13px; }
.timeline-action { font-size: 12px; color: #10b981; }
.timeline-remark { color: var(--text-secondary); font-size: 12px; margin-bottom: 2px; }
.timeline-time { font-size: 11px; color: var(--text-secondary); }

/* ===== 右侧标签页 ===== */
.tabs-card { height: 100%; }
.detail-tabs :deep(.el-tabs__header) { padding: 0 20px; margin: 0; }
.detail-tabs :deep(.el-tabs__content) { padding: 0; }
.tab-content { padding: 20px; }

/* 广告项目组 */
.face-group { margin-bottom: 20px; }
.face-group:last-child { margin-bottom: 0; }
.face-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fafbfc;
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}
.group-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}
.group-icon.type-1 { background: #6366f1; }
.group-icon.type-2 { background: #f59e0b; }
.group-icon.type-3 { background: #10b981; }
.group-name { font-weight: 700; font-size: 13px; }
.group-meta { font-size: 11px; color: var(--text-secondary); margin-left: auto; }

.face-list { display: flex; flex-direction: column; gap: 8px; }
.face-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s;
}
.face-item:hover { border-color: var(--brand-primary); }
.face-info { flex: 1; min-width: 0; }
.face-name { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.face-spec { font-size: 11px; color: var(--text-secondary); font-family: monospace; }
.face-material { font-size: 11px; color: var(--brand-primary); }
.face-photos { display: flex; gap: 6px; align-items: center; }
.face-photo {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}
.face-photo-img { width: 100%; height: 100%; object-fit: cover; }
.no-photo { font-size: 11px; color: var(--text-secondary); }

/* 设计图 */
.drawings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
.drawing-item { border-radius: var(--radius-md); overflow: hidden; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; }
.drawing-item:hover { border-color: var(--brand-primary); transform: translateY(-2px); }
.drawing-img { width: 100%; height: 140px; object-fit: cover; }
.drawing-label { padding: 6px 10px; font-size: 12px; font-weight: 500; background: #fafbfc; }

/* 安装报告 */
.report-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.meta-item { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
.meta-value { font-size: 13px; color: var(--text-primary); font-weight: 500; }

.photo-block { margin-top: 20px; }
.photo-block-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.photo-block-title .dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.before { background: #f59e0b; }
.dot.after { background: #10b981; }
.dot.overall { background: var(--brand-primary); }

.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.photo-thumb { height: 110px; border-radius: var(--radius-md); overflow: hidden; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; }
.photo-thumb:hover { border-color: var(--brand-primary); transform: translateY(-2px); }
.photo-thumb-img { width: 100%; height: 100%; object-fit: cover; }

.issue-box { margin-top: 16px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); color: #991b1b; font-size: 13px; }
.report-remark { margin-top: 16px; font-size: 13px; color: var(--text-secondary); }

/* 数据汇总 */
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.summary-stat { display: flex; align-items: center; gap: 12px; padding: 14px; background: #fafbfc; border-radius: var(--radius-md); }
.stat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; }
.stat-icon.blue { background: #6366f1; }
.stat-icon.green { background: #10b981; }
.stat-icon.orange { background: #f59e0b; }
.stat-icon.purple { background: #8b5cf6; }
.stat-value { font-size: 18px; font-weight: 800; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-secondary); }

.ad-type-breakdown { margin-top: 8px; }
.breakdown-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.breakdown-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.breakdown-label { width: 80px; font-size: 12px; font-weight: 600; color: var(--text-primary); flex-shrink: 0; }
.breakdown-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.breakdown-bar { height: 100%; background: var(--brand-primary); border-radius: 4px; transition: width 0.5s; }
.breakdown-value { width: 120px; text-align: right; font-size: 12px; color: var(--text-secondary); font-family: monospace; flex-shrink: 0; }

/* 打印 */
@media print {
  .status-bar, .card-body.no-padding > .el-tabs__header { display: none !important; }
  .archive-detail-page { max-width: 100%; }
}

@media (max-width: 1200px) {
  .main-grid { grid-template-columns: 1fr; }
  .flow-steps-horizontal { overflow-x: auto; padding-bottom: 8px; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .summary-bar { flex-wrap: wrap; }
  .summary-divider { display: none; }
  .summary-item { min-width: calc(50% - 8px); margin-bottom: 8px; }
}
</style>
