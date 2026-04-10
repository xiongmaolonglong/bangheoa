<template>
  <div class="batch-review">
    <!-- 批量选择工具栏 -->
    <div class="batch-toolbar" v-if="selectedOrders.length > 0">
      <span class="selected-count">
        已选择 <strong>{{ selectedOrders.length }}</strong> 个订单
      </span>
      <el-button-group>
        <el-button type="primary" @click="showBatchDialog = true">
          批量审核
        </el-button>
        <el-button @click="clearSelection">
          取消选择
        </el-button>
      </el-button-group>
    </div>

    <!-- 批量审核对话框 -->
    <el-dialog
      v-model="showBatchDialog"
      title="批量审核"
      width="600px"
      :close-on-click-modal="false"
    >
      <!-- 审核订单列表 -->
      <div class="review-list">
        <div class="list-header">
          <span>待审核订单</span>
        </div>
        <div class="order-tags">
          <el-tag
            v-for="order in selectedOrders"
            :key="order.id"
            closable
            @close="removeOrder(order)"
            class="order-tag"
          >
            {{ order.order_no }}
          </el-tag>
        </div>
      </div>

      <!-- 审核表单 -->
      <el-form :model="batchForm" label-width="100px" class="review-form">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="batchForm.result">
            <el-radio label="approve">
              <el-icon><CircleCheck /></el-icon>
              通过
            </el-radio>
            <el-radio label="reject">
              <el-icon><CircleClose /></el-icon>
              驳回
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="审核意见" required>
          <div class="comment-section">
            <!-- 快捷模板 -->
            <div class="quick-comments">
              <el-tag
                v-for="template in commentTemplates"
                :key="template"
                class="template-tag"
                @click="batchForm.comment = template"
              >
                {{ template }}
              </el-tag>
            </div>

            <!-- 自定义输入 -->
            <el-input
              v-model="batchForm.comment"
              type="textarea"
              :rows="3"
              placeholder="请输入审核意见或选择上方模板"
              maxlength="200"
              show-word-limit
            />
          </div>
        </el-form-item>

        <!-- 派单选项（审核通过时显示） -->
        <template v-if="batchForm.result === 'approve' && needDispatch">
          <el-form-item label="指派人员">
            <el-select
              v-model="batchForm.assignee_id"
              placeholder="选择指派人员"
              filterable
              style="width: 100%"
            >
              <el-option
                v-for="user in availableHandlers"
                :key="user.id"
                :label="user.real_name"
                :value="user.id"
              >
                <div class="handler-option">
                  <span>{{ user.real_name }}</span>
                  <span class="workload">当前任务: {{ user.current_tasks || 0 }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="预期完成">
            <el-date-picker
              v-model="batchForm.expected_date"
              type="date"
              placeholder="选择预期完成日期"
              style="width: 100%"
              :disabled-date="disabledDate"
            />
          </el-form-item>
        </template>

        <!-- 驳回原因（驳回时显示） -->
        <template v-if="batchForm.result === 'reject'">
          <el-form-item label="驳回原因" required>
            <el-select
              v-model="batchForm.reject_reason"
              placeholder="选择驳回原因"
              style="width: 100%"
            >
              <el-option label="信息不完整" value="信息不完整" />
              <el-option label="资料有误" value="资料有误" />
              <el-option label="不符合规范" value="不符合规范" />
              <el-option label="其他原因" value="其他" />
            </el-select>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitBatchReview"
        >
          确认审核
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核结果预览 -->
    <el-dialog
      v-model="showResultDialog"
      title="审核结果"
      width="500px"
    >
      <el-result
        :icon="batchResult.success ? 'success' : 'warning'"
        :title="batchResult.success ? '批量审核完成' : '部分审核失败'"
      >
        <template #sub-title>
          <div class="result-stats">
            <div class="stat-item success">
              <span class="label">成功</span>
              <span class="value">{{ batchResult.successCount }}</span>
            </div>
            <div class="stat-item fail" v-if="batchResult.failCount > 0">
              <span class="label">失败</span>
              <span class="value">{{ batchResult.failCount }}</span>
            </div>
          </div>
        </template>
        <template #extra>
          <div class="fail-list" v-if="batchResult.failedOrders.length > 0">
            <div class="fail-title">失败订单：</div>
            <div v-for="item in batchResult.failedOrders" :key="item.order_no" class="fail-item">
              {{ item.order_no }}: {{ item.reason }}
            </div>
          </div>
          <el-button type="primary" @click="showResultDialog = false">确定</el-button>
        </template>
      </el-result>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { reviewApi } from '@/api'
import dayjs from 'dayjs'

const props = defineProps({
  selectedOrders: {
    type: Array,
    default: () => []
  },
  reviewType: {
    type: String,
    default: 'measure' // measure, design, install
  }
})

const emit = defineEmits(['success', 'clear-selection'])

const showBatchDialog = ref(false)
const showResultDialog = ref(false)
const submitting = ref(false)

const batchForm = ref({
  result: 'approve',
  comment: '',
  assignee_id: null,
  expected_date: null,
  reject_reason: ''
})

const commentTemplates = [
  '符合要求，同意通过',
  '资料完整，可以执行',
  '信息不全，请补充',
  '不符合规范，请修改',
  '需要现场核实'
]

const availableHandlers = ref([])
const batchResult = ref({
  success: false,
  successCount: 0,
  failCount: 0,
  failedOrders: []
})

// 是否需要派单
const needDispatch = computed(() => {
  const dispatchTypes = ['measure', 'design', 'install']
  return dispatchTypes.includes(props.reviewType)
})

// 禁用过去的日期
const disabledDate = (date) => {
  return date < new Date()
}

// 加载可派单人员
const loadHandlers = async () => {
  if (!needDispatch.value) return

  try {
    const res = await reviewApi.getHandlers({ type: props.reviewType })
    availableHandlers.value = res.data
  } catch (err) {
    console.error('加载人员失败:', err)
  }
}

// 移除订单
const removeOrder = (order) => {
  const index = props.selectedOrders.findIndex(o => o.id === order.id)
  if (index !== -1) {
    props.selectedOrders.splice(index, 1)
  }
}

// 清空选择
const clearSelection = () => {
  emit('clear-selection')
  showBatchDialog.value = false
}

// 提交批量审核
const submitBatchReview = async () => {
  // 验证
  if (!batchForm.value.comment) {
    ElMessage.warning('请输入审核意见')
    return
  }

  if (batchForm.value.result === 'approve' && needDispatch.value && !batchForm.value.assignee_id) {
    ElMessage.warning('请选择指派人员')
    return
  }

  if (batchForm.value.result === 'reject' && !batchForm.value.reject_reason) {
    ElMessage.warning('请选择驳回原因')
    return
  }

  // 确认操作
  const actionText = batchForm.value.result === 'approve' ? '通过' : '驳回'
  await ElMessageBox.confirm(
    `确定要批量${actionText} ${props.selectedOrders.length} 个订单吗？`,
    '确认操作',
    { type: 'warning' }
  )

  submitting.value = true
  batchResult.value = {
    success: false,
    successCount: 0,
    failCount: 0,
    failedOrders: []
  }

  try {
    // 并发提交审核
    const promises = props.selectedOrders.map(order =>
      submitReview(order.id)
        .then(() => {
          batchResult.value.successCount++
        })
        .catch(err => {
          batchResult.value.failCount++
          batchResult.value.failedOrders.push({
            order_no: order.order_no,
            reason: err.message || '审核失败'
          })
        })
    )

    await Promise.all(promises)

    batchResult.value.success = batchResult.value.failCount === 0
    showBatchDialog.value = false
    showResultDialog.value = true

    emit('success')
  } catch (err) {
    ElMessage.error('批量审核失败')
  } finally {
    submitting.value = false
  }
}

// 提交单个审核
const submitReview = async (orderId) => {
  const data = {
    comment: batchForm.value.comment
  }

  if (batchForm.value.result === 'approve') {
    if (needDispatch.value) {
      data.assignee_id = batchForm.value.assignee_id
      data.expected_date = batchForm.value.expected_date
    }
    return await reviewApi.approve(orderId, data)
  } else {
    data.reason = batchForm.value.reject_reason
    return await reviewApi.reject(orderId, data)
  }
}

// 监听对话框打开
watch(showBatchDialog, (val) => {
  if (val) {
    loadHandlers()
    // 重置表单
    batchForm.value = {
      result: 'approve',
      comment: '',
      assignee_id: null,
      expected_date: null,
      reject_reason: ''
    }
  }
})
</script>

<style scoped>
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  margin-bottom: 16px;
}

.selected-count {
  font-size: 14px;
}

.selected-count strong {
  color: var(--el-color-primary);
  font-size: 16px;
}

.review-list {
  margin-bottom: 20px;
}

.list-header {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
}

.order-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-tag {
  cursor: default;
}

.review-form {
  padding-top: 20px;
}

.comment-section {
  width: 100%;
}

.quick-comments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.template-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.handler-option {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.workload {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 16px 0;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.stat-item .value {
  font-size: 24px;
  font-weight: 600;
}

.stat-item.success .value {
  color: var(--el-color-success);
}

.stat-item.fail .value {
  color: var(--el-color-danger);
}

.fail-list {
  text-align: left;
  margin: 16px 0;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.fail-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.fail-item {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
</style>