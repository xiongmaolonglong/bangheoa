<template>
  <el-dialog v-model="visible" :title="'批量操作（已选 ' + count + ' 项）'" width="480px">
    <el-radio-group v-model="batchAction" style="margin-bottom: 16px">
      <el-radio label="dispatch">批量派单</el-radio>
      <el-radio label="delete">批量删除</el-radio>
    </el-radio-group>

    <el-form v-if="batchAction === 'dispatch'" label-width="80px">
      <el-form-item label="负责人">
        <el-select v-model="batchForm.assigned_to" placeholder="选择人员" style="width:100%">
          <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="截止日">
        <el-date-picker v-model="batchForm.deadline" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
    </el-form>

    <el-alert v-if="batchAction === 'delete'" type="warning" show-icon :closable="false" style="margin-bottom: 16px">
      仅可删除处于「待派单」阶段且未派单的工单
    </el-alert>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="executeBatch" :loading="executing">执行</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const props = defineProps({ modelValue: Boolean, count: Number, selections: Array, userOptions: Array })
const emit = defineEmits(['update:modelValue', 'done'])

const visible = ref(false)
const batchAction = ref('dispatch')
const executing = ref(false)
const batchForm = reactive({ assigned_to: '', deadline: '' })

watch(() => props.modelValue, (val) => { visible.value = val })
watch(visible, (val) => { emit('update:modelValue', val) })

async function executeBatch() {
  if (batchAction.value === 'dispatch' && !batchForm.assigned_to) {
    return ElMessage.warning('请选择负责人')
  }
  executing.value = true
  const ids = props.selections.map(s => s.id)

  try {
    if (batchAction.value === 'dispatch') {
      await Promise.all(ids.map(id => api.post('/assignments', {
        work_order_id: id,
        assigned_to: batchForm.assigned_to,
        deadline: batchForm.deadline || null,
      })))
    } else if (batchAction.value === 'delete') {
      await Promise.all(ids.map(id => api.delete(`/work-orders/${id}`)))
    }
    ElMessage.success(`成功执行 ${ids.length} 项`)
    emit('done')
    visible.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '批量操作失败')
  } finally {
    executing.value = false
  }
}
</script>
