<template>
  <div class="auto-review-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>自动审核配置</span>
          <el-button type="primary" :loading="saving" @click="handleSave">
            <el-icon><Check /></el-icon> 保存配置
          </el-button>
        </div>
      </template>

      <!-- 方案B: 智能预审核 -->
      <div class="config-section">
        <h3>智能预审核（方案B）</h3>
        <p class="section-desc">系统自动评估待审核订单风险，低风险订单自动通过，高风险订单标记预警</p>

        <div class="toggle-item">
          <div class="toggle-info">
            <span class="toggle-name">启用预审核</span>
            <span class="toggle-desc">开启后，系统每30分钟自动评估 pending_review 订单风险</span>
          </div>
          <el-switch v-model="config.pre_review_enabled" />
        </div>

        <div class="config-grid">
          <div class="config-field">
            <label>自动通过阈值</label>
            <div class="field-input-row">
              <el-input-number v-model="config.pre_review_auto_approve_threshold" :min="0" :max="100" :step="5" size="small" />
              <span class="field-hint">风险分 ≤ 此值时自动通过</span>
            </div>
          </div>
          <div class="config-field">
            <label>高风险阈值</label>
            <div class="field-input-row">
              <el-input-number v-model="config.pre_review_high_risk_threshold" :min="0" :max="100" :step="5" size="small" />
              <span class="field-hint">风险分 ≥ 此值时标记为高风险</span>
            </div>
          </div>
        </div>

        <div class="risk-weights">
          <h4>风险评估权重</h4>
          <p class="section-desc">各风险项的扣分权重，分数越高表示风险越大</p>
          <div class="weights-grid">
            <div class="weight-item">
              <span class="weight-label">无详细地址</span>
              <el-input-number v-model="config.risk_weights.no_address" :min="0" :max="100" size="small" />
            </div>
            <div class="weight-item">
              <span class="weight-label">无现场照片</span>
              <el-input-number v-model="config.risk_weights.no_photo" :min="0" :max="100" size="small" />
            </div>
            <div class="weight-item">
              <span class="weight-label">新客户（无历史订单）</span>
              <el-input-number v-model="config.risk_weights.no_customer_history" :min="0" :max="100" size="small" />
            </div>
            <div class="weight-item">
              <span class="weight-label">表单字段缺失</span>
              <el-input-number v-model="config.risk_weights.incomplete_form" :min="0" :max="100" size="small" />
            </div>
            <div class="weight-item">
              <span class="weight-label">无经纬度坐标</span>
              <el-input-number v-model="config.risk_weights.no_location" :min="0" :max="100" size="small" />
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 方案C: 超时自动通过 -->
      <div class="config-section">
        <h3>超时自动处理（方案C）</h3>
        <p class="section-desc">订单超过设定时间未处理时，自动通过或转派给管理员</p>

        <div class="toggle-item">
          <div class="toggle-info">
            <span class="toggle-name">启用超时自动处理</span>
            <span class="toggle-desc">开启后，系统每小时检查超时订单</span>
          </div>
          <el-switch v-model="config.timeout_auto_approve_enabled" />
        </div>

        <div class="config-grid">
          <div class="config-field">
            <label>超时时间</label>
            <div class="field-input-row">
              <el-input-number v-model="config.timeout_hours" :min="1" :max="168" :step="2" size="small" />
              <span class="field-hint">超过此小时数未处理则触发动作</span>
            </div>
          </div>
          <div class="config-field">
            <label>超时动作</label>
            <div class="field-input-row">
              <el-select v-model="config.timeout_action" size="small" style="width: 160px">
                <el-option label="自动通过" value="auto_approve" />
                <el-option label="转派给管理员" value="escalate" />
              </el-select>
              <span class="field-hint">选择超时后的处理方式</span>
            </div>
          </div>
          <div class="config-field" v-if="config.timeout_action === 'escalate'">
            <label>转派目标用户ID</label>
            <div class="field-input-row">
              <el-input v-model="config.timeout_escalate_user_id" size="small" placeholder="输入用户ID" style="width: 120px" />
              <span class="field-hint">超时订单将转派给该用户处理</span>
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 手动触发 -->
      <div class="config-section">
        <h3>手动触发</h3>
        <p class="section-desc">立即执行一次自动审核检查，无需等待定时任务</p>
        <div class="manual-actions">
          <el-button type="primary" plain :loading="preReviewLoading" @click="handleTriggerPreReview">
            执行预审核
          </el-button>
          <el-button type="warning" plain :loading="timeoutCheckLoading" @click="handleTriggerTimeoutCheck">
            执行超时检查
          </el-button>
        </div>
        <div v-if="lastRunResult" class="last-run">
          <span>上次预审核：处理 {{ lastRunResult.processed }} 单，自动通过 {{ lastRunResult.autoApproved }} 单，标记高风险 {{ lastRunResult.flagged }} 单</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { reviewApi } from '@/api'

const saving = ref(false)
const preReviewLoading = ref(false)
const timeoutCheckLoading = ref(false)
const lastRunResult = ref(null)

const config = reactive({
  pre_review_enabled: false,
  pre_review_auto_approve_threshold: 20,
  pre_review_high_risk_threshold: 60,
  timeout_auto_approve_enabled: false,
  timeout_hours: 48,
  timeout_action: 'auto_approve',
  timeout_escalate_user_id: null,
  risk_weights: {
    no_address: 30,
    no_photo: 25,
    no_customer_history: 15,
    incomplete_form: 20,
    no_location: 10
  }
})

const loadConfig = async () => {
  try {
    const res = await reviewApi.getAutoReviewConfig()
    if (res.data) {
      Object.assign(config, res.data)
    }
  } catch (e) {
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await reviewApi.updateAutoReviewConfig(config)
    ElMessage.success('自动审核配置已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleTriggerPreReview = async () => {
  preReviewLoading.value = true
  try {
    const res = await reviewApi.triggerPreReview()
    lastRunResult.value = res.data
    ElMessage.success(`预审核完成：处理 ${res.data.processed} 单，自动通过 ${res.data.autoApproved} 单`)
  } catch (e) {
    ElMessage.error('预审核触发失败')
  } finally {
    preReviewLoading.value = false
  }
}

const handleTriggerTimeoutCheck = async () => {
  timeoutCheckLoading.value = true
  try {
    const res = await reviewApi.triggerTimeoutCheck()
    ElMessage.success(`超时检查完成：处理 ${res.data.processed} 单，自动通过 ${res.data.actioned} 单`)
  } catch (e) {
    ElMessage.error('超时检查触发失败')
  } finally {
    timeoutCheckLoading.value = false
  }
}

onMounted(() => { loadConfig() })
</script>

<style scoped>
.auto-review-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.config-section { margin-bottom: 24px; }
.config-section h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.config-section h4 { margin: 0 0 8px; font-size: 14px; color: var(--text-primary); }
.section-desc { color: var(--text-secondary); font-size: 13px; margin: 0 0 12px; }

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 16px;
}
.toggle-info { display: flex; flex-direction: column; gap: 4px; }
.toggle-name { font-weight: 500; color: var(--text-primary); }
.toggle-desc { font-size: 12px; color: var(--text-secondary); }

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
.config-field { display: flex; flex-direction: column; gap: 8px; }
.config-field label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.field-input-row { display: flex; flex-direction: column; gap: 4px; }
.field-hint { font-size: 11px; color: var(--text-muted); }

.risk-weights { margin-top: 16px; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; }
.weights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.weight-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 6px; }
.weight-label { font-size: 13px; color: var(--text-primary); }

.manual-actions { display: flex; gap: 12px; margin-bottom: 12px; }
.last-run { font-size: 12px; color: var(--text-secondary); padding: 8px 12px; background: var(--bg-tertiary); border-radius: 6px; }
</style>
