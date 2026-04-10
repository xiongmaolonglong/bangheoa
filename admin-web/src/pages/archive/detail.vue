<template>
  <div class="archive-detail">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <el-button text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <el-divider direction="vertical" />
        <span class="order-no">{{ order?.order_no }}</span>
        <el-tag type="success" size="large">已归档</el-tag>
      </div>
      <div class="status-right">
        <el-button @click="handleExport">导出报告</el-button>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="main-content" v-loading="loading">
      <div class="content-wrapper">
        <el-row :gutter="20">
          <el-col :span="8">
            <!-- 订单信息 -->
            <div class="section-card">
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>订单信息</span>
              </div>
              <div class="card-body">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="订单编号">{{ order?.order_no }}</el-descriptions-item>
                  <el-descriptions-item label="店铺名称">{{ order?.form_data?.company || order?.title || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="客户姓名">{{ order?.customer?.real_name || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="联系电话">{{ order?.customer?.phone || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="安装地址">{{ order?.form_data?.address || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="需求说明">{{ order?.requirement || '-' }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </div>

            <!-- 流程时间线 -->
            <div class="section-card" style="margin-top: 16px">
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>流程时间线</span>
              </div>
              <div class="card-body">
                <el-timeline v-if="logs.length">
                  <el-timeline-item
                    v-for="log in logs"
                    :key="log.id"
                    :timestamp="formatDate(log.created_at)"
                    placement="top"
                    size="small"
                  >
                    <div class="log-item">
                      <span class="log-operator">{{ log.operator?.real_name || '系统' }}</span>
                      <span class="log-action">{{ getActionText(log.action) }}</span>
                    </div>
                  </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="暂无记录" :image-size="60" />
              </div>
            </div>
          </el-col>

          <el-col :span="16">
            <div class="section-card">
              <div class="card-body" style="padding: 0">
                <el-tabs v-model="activeTab">
                  <!-- 广告项目 -->
                  <el-tab-pane name="items">
                    <template #label>
                      <span><el-icon><List /></el-icon> 广告项目</span>
                    </template>
                    <div style="padding: 20px">
                      <el-table :data="allFaces" stripe size="small" border>
                        <el-table-column label="广告类型" width="120">
                          <template #default="{ row }">{{ row.ad_type_name || '-' }}</template>
                        </el-table-column>
                        <el-table-column prop="face_name" label="面名称" width="100" />
                        <el-table-column label="尺寸(cm)" width="120">
                          <template #default="{ row }">{{ row.width }} × {{ row.height }}</template>
                        </el-table-column>
                        <el-table-column label="面积(㎡)" width="100">
                          <template #default="{ row }">{{ ((row.width * row.height) / 10000).toFixed(2) }}</template>
                        </el-table-column>
                        <el-table-column label="材质" width="100">
                          <template #default="{ row }">{{ row.material?.name || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="现场照片" width="100">
                          <template #default="{ row }">
                            <div class="photo-list" v-if="row.photos?.length">
                              <el-image
                                v-for="(photo, idx) in parsePhotos(row.photos).slice(0, 2)"
                                :key="idx"
                                :src="getPhotoUrl(photo)"
                                :preview-src-list="parsePhotos(row.photos).map(getPhotoUrl)"
                                :preview-teleported="true"
                                fit="cover"
                                class="photo-thumb"
                              />
                            </div>
                            <span v-else>-</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="备注">
                          <template #default="{ row }">{{ row.remark || '-' }}</template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </el-tab-pane>

                  <!-- 设计方案 -->
                  <el-tab-pane name="design" v-if="order?.designScheme">
                    <template #label>
                      <span><el-icon><Edit /></el-icon> 设计方案</span>
                    </template>
                    <div style="padding: 20px">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="设计师">{{ order?.designScheme?.designer?.real_name || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="设计时间">{{ formatDate(order?.designScheme?.created_at) }}</el-descriptions-item>
                        <el-descriptions-item label="方案说明" :span="2">{{ order?.designScheme?.description || '-' }}</el-descriptions-item>
                      </el-descriptions>
                      <div class="drawings-section" v-if="designDrawings.length">
                        <div class="section-sub-title">效果图</div>
                        <div class="drawings-grid">
                          <el-image
                            v-for="(img, index) in designDrawings"
                            :key="index"
                            :src="getPhotoUrl(img.file_url)"
                            :preview-src-list="designDrawings.map(d => getPhotoUrl(d.file_url))"
                            :preview-teleported="true"
                            fit="cover"
                            class="drawing-item"
                          />
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>

                  <!-- 安装报告 -->
                  <el-tab-pane name="install" v-if="order?.installReport">
                    <template #label>
                      <span><el-icon><Position /></el-icon> 安装报告</span>
                    </template>
                    <div style="padding: 20px">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="安装员">{{ order?.installReport?.installer?.real_name || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="安装日期">{{ order?.installReport?.install_date || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="完成情况" :span="2">{{ order?.installReport?.completion_rate || 100 }}%</el-descriptions-item>
                        <el-descriptions-item label="客户签字" :span="2">
                          <el-image
                            v-if="order?.installReport?.customer_sign"
                            :src="getPhotoUrl(order.installReport.customer_sign)"
                            :preview-teleported="true"
                            style="width: 120px"
                          />
                          <span v-else>-</span>
                        </el-descriptions-item>
                      </el-descriptions>
                      <div class="photos-section" v-if="installPhotos.length">
                        <div class="section-sub-title">安装照片</div>
                        <div class="photos-grid">
                          <el-image
                            v-for="(photo, index) in installPhotos"
                            :key="index"
                            :src="getPhotoUrl(photo)"
                            :preview-src-list="installPhotos.map(getPhotoUrl)"
                            :preview-teleported="true"
                            fit="cover"
                            class="photo-item"
                          />
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document, Clock, List, Edit, Position } from '@element-plus/icons-vue'
import { orderApi } from '@/api'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const activeTab = ref('items')

const order = ref({})
const logs = ref([])

const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'

const allFaces = computed(() => {
  const faces = []
  order.value?.adItems?.forEach(item => {
    item.faces?.forEach(face => { faces.push({ ...face, ad_type_name: item.adType?.name, material: face.material }) })
  })
  return faces
})

const designDrawings = computed(() => {
  const drawings = []
  order.value?.designScheme?.groups?.forEach(group => { group.drawings?.forEach(d => drawings.push(d)) })
  return drawings
})

const installPhotos = computed(() => {
  const report = order.value?.installReport
  if (!report) return []
  const before = report.before_photos ? JSON.parse(report.before_photos) : []
  const after = report.after_photos ? JSON.parse(report.after_photos) : []
  return [...before, ...after]
})

const getPhotoUrl = (photo) => {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  if (photo.startsWith('data:')) return photo
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
  approve: '审核通过', reject: '驳回订单', dispatch: '派单',
  design_submit: '提交设计', design_approve: '设计审核通过',
  install_submit: '提交安装'
}

const getActionText = (action) => actionMap[action] || action

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await orderApi.getDetail(route.params.id)
    order.value = res.data || {}
    logs.value = res.data?.logs || []
  } catch (err) { ElMessage.error('获取详情失败') }
  finally { loading.value = false }
}

const handleBack = () => router.push('/archive')
const handleExport = () => ElMessage.info('导出功能开发中')

onMounted(() => { fetchDetail() })
</script>

<style scoped>
.archive-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.section-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #e8e8e8;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.card-body {
  padding: 20px;
}

.section-sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #1a1a2e;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.log-operator {
  font-weight: 600;
  color: var(--el-color-primary);
}

.log-action {
  color: var(--brand-primary);
}

.photo-list {
  display: flex;
  gap: 4px;
}

.photo-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
}

.drawings-section,
.photos-section {
  margin-top: 16px;
}

.drawings-section .section-sub-title,
.photos-section .section-sub-title {
  margin: 0 0 12px 0;
}

.drawings-grid,
.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.drawing-item,
.photo-item {
  width: 150px;
  height: 150px;
  border-radius: 8px;
  cursor: pointer;
}
</style>
