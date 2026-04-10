<template>
  <div class="install-report-page">
    <!-- 订单信息 -->
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <span>订单信息</span>
          <el-tag :type="getStatusType(order?.status)">{{ getStatusText(order?.status) }}</el-tag>
        </div>
      </template>
      <el-descriptions :column="3" border size="small" v-if="order">
        <el-descriptions-item label="订单编号">{{ order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="订单标题">{{ order.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ order.customer?.real_name || order.customer_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="安装地址" :span="3">{{ order.address || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 安装报告表单 -->
    <el-card class="report-card">
      <template #header>安装报告</template>

      <el-form :model="reportForm" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="安装日期" prop="install_date">
              <el-date-picker v-model="reportForm.install_date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="天气情况" prop="weather">
              <el-select v-model="reportForm.weather" placeholder="选择天气" style="width: 100%">
                <el-option label="晴天" value="sunny" />
                <el-option label="多云" value="cloudy" />
                <el-option label="阴天" value="overcast" />
                <el-option label="小雨" value="light_rain" />
                <el-option label="大雨" value="heavy_rain" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户满意度" prop="customer_satisfaction">
              <el-select v-model="reportForm.customer_satisfaction" placeholder="选择满意度" style="width: 100%">
                <el-option label="满意" value="satisfied" />
                <el-option label="基本满意" value="basic" />
                <el-option label="不满意" value="unsatisfied" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 安装前照片 -->
        <el-form-item label="安装前照片">
          <el-upload
            v-model:file-list="reportForm.before_photos"
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <!-- 安装后照片 -->
        <el-form-item label="安装后照片">
          <el-upload
            v-model:file-list="reportForm.after_photos"
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <!-- 整体效果照片 -->
        <el-form-item label="整体效果">
          <el-upload
            v-model:file-list="reportForm.overall_photos"
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <!-- 遗留问题 -->
        <el-form-item label="遗留问题">
          <el-switch v-model="reportForm.has_issue" :active-value="1" :inactive-value="0" />
          <el-input v-if="reportForm.has_issue" v-model="reportForm.issue_desc" type="textarea" :rows="3" placeholder="请描述遗留问题..." style="margin-top: 10px" />
        </el-form-item>

        <!-- 客户签字 -->
        <el-form-item label="客户签字">
          <el-upload
            :show-file-list="false"
            :before-upload="handleSignUpload"
            accept="image/*"
          >
            <div class="sign-upload">
              <el-image v-if="reportForm.customer_sign" :src="reportForm.customer_sign" style="width: 200px; height: 100px" fit="contain" />
              <div v-else class="sign-placeholder">
                <el-icon><Edit /></el-icon>
                <span>上传签字照片</span>
              </div>
            </div>
          </el-upload>
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input v-model="reportForm.remark" type="textarea" :rows="3" placeholder="安装说明..." />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button @click="handleBack">返回</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交报告</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { installApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const orderId = route.params.id

const loading = ref(false)
const submitting = ref(false)
const order = ref(null)
const formRef = ref(null)

const reportForm = reactive({
  install_date: dayjs().format('YYYY-MM-DD'),
  weather: '',
  customer_satisfaction: 'satisfied',
  before_photos: [],
  after_photos: [],
  overall_photos: [],
  has_issue: 0,
  issue_desc: '',
  customer_sign: '',
  remark: ''
})

const rules = {
  install_date: [{ required: true, message: '请选择安装日期', trigger: 'change' }]
}

const statusMap = {
  installing: { text: '待安装', type: 'primary' },
  install_review: { text: '待审核', type: 'warning' },
  archived: { text: '已归档', type: 'success' }
}

const getStatusText = (status) => statusMap[status]?.text || status
const getStatusType = (status) => statusMap[status]?.type || ''

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await installApi.getDetail(orderId)
    order.value = res.data

    // 检查是否已有报告
    try {
      const reportRes = await installApi.getReport(orderId)
      if (reportRes.data) {
        const data = reportRes.data
        Object.assign(reportForm, {
          install_date: data.install_date || dayjs().format('YYYY-MM-DD'),
          weather: data.weather || '',
          customer_satisfaction: data.customer_satisfaction || 'satisfied',
          before_photos: data.before_photos || [],
          after_photos: data.after_photos || [],
          overall_photos: data.overall_photos || [],
          has_issue: data.has_issue || 0,
          issue_desc: data.issue_desc || '',
          customer_sign: data.customer_sign || '',
          remark: data.remark || ''
        })
      }
    } catch (e) {
      // 报告不存在
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

const handleSignUpload = (file) => {
  const reader = new FileReader()
  reader.onload = () => {
    reportForm.customer_sign = reader.result
  }
  reader.readAsDataURL(file)
  return false
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const data = {
      install_date: reportForm.install_date,
      weather: reportForm.weather,
      customer_satisfaction: reportForm.customer_satisfaction,
      before_photos: reportForm.before_photos.map(f => f.url || f.response?.url || f.raw),
      after_photos: reportForm.after_photos.map(f => f.url || f.response?.url || f.raw),
      overall_photos: reportForm.overall_photos.map(f => f.url || f.response?.url || f.raw),
      has_issue: reportForm.has_issue,
      issue_desc: reportForm.issue_desc,
      customer_sign: reportForm.customer_sign,
      remark: reportForm.remark
    }

    await installApi.submitReport(orderId, data)
    ElMessage.success('安装报告提交成功')
    router.push('/install')
  } catch (err) {
    console.error(err)
    ElMessage.error(err.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.back()
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.install-report-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card, .report-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sign-upload {
  cursor: pointer;
}

.sign-placeholder {
  width: 200px;
  height: 100px;
  border: 1px dashed var(--border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.sign-placeholder:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
}
</style>