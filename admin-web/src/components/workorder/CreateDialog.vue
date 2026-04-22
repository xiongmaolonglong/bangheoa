<template>
  <el-dialog v-model="visible" title="补录工单" width="520px" @open="loadConfig">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" v-loading="loading">
      <template v-if="fields.length">
        <el-form-item
          v-for="field in fields"
          :key="field.field_key"
          :label="field.field_label"
          :prop="field.field_key"
          :required="field.required">
          <AddressPicker v-if="field.enable_parse || field.field_type === 'address'"
            v-model="form[field.field_key]" :placeholder="field.placeholder"
            :field-label="field.field_label" />
          <el-select v-else-if="field.field_type === 'client_select'"
            v-model="form[field.field_key]" placeholder="请选择" style="width:100%">
            <el-option v-for="c in clients" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-else-if="field.field_type === 'select'"
            v-model="form[field.field_key]" :placeholder="field.placeholder || '请选择'" style="width:100%">
            <el-option v-for="opt in (field.options || [])" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-input v-else-if="field.field_type === 'textarea'"
            v-model="form[field.field_key]" type="textarea" :rows="3" :placeholder="field.placeholder || '请输入'" />
          <el-input-number v-else-if="field.field_type === 'number'"
            v-model="form[field.field_key]" :min="0" :precision="2" controls-position="right" style="width:100%" />
          <el-date-picker v-else-if="field.field_type === 'date'"
            v-model="form[field.field_key]" type="date" :placeholder="field.placeholder || '请选择日期'" style="width:100%" value-format="YYYY-MM-DD" />
          <el-upload v-else-if="field.field_type === 'image'"
            action="/api/v1/files" list-type="picture-card"
            :file-list="uploadFileLists[field.field_key] || []"
            :on-success="(res, file) => onFileSuccess(res, file, field.field_key)"
            :headers="{ Authorization: `Bearer ${token}` }"
            name="file">
            <el-icon><Plus /></el-icon>
          </el-upload>
          <el-input v-else v-model="form[field.field_key]" :placeholder="field.placeholder || '请输入'" />
        </el-form-item>
      </template>
      <el-empty v-else description="未加载到表单配置" />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit" :loading="submitting">确认创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '../../store/auth'
import api from '../../api'
import AddressPicker from '../AddressPicker.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  clients: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'done'])

const auth = useAuthStore()
const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const fields = ref([])
const form = reactive({})
const rules = ref({})
const uploadFileLists = ref({})
const token = auth.token

watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => emit('update:modelValue', v))

async function loadConfig() {
  loading.value = true
  try {
    const res = await api.get('/tenant/form-config/work_order_create')
    if (res.code === 0 && res.data) {
      fields.value = res.data.fields || []
      const r = {}
      fields.value.forEach(f => {
        if (f.required) r[f.field_key] = [{ required: true, message: `请输入${f.field_label}`, trigger: 'change' }]
        form[f.field_key] = f.default_value !== undefined ? f.default_value : f.field_type === 'image' ? [] : ''
      })
      rules.value = r
      loadDefaultClient()
    }
  } catch (e) {
    console.error('加载创建表单配置失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadDefaultClient() {
  try {
    const res = await api.get('/clients/default')
    if (res.code === 0 && res.data?.default_client_id) {
      form.client_id = res.data.default_client_id
    }
  } catch {}
}

function onFileSuccess(res, file, fieldKey) {
  const url = res.url || res.data?.url
  if (!url) return ElMessage.error('上传成功但未返回文件地址')
  if (!form[fieldKey]) form[fieldKey] = []
  if (!form[fieldKey].includes(url)) form[fieldKey].push(url)
  if (!uploadFileLists.value[fieldKey]) uploadFileLists.value[fieldKey] = []
  uploadFileLists.value[fieldKey].push({ name: file.name || url.split('/').pop(), url })
}

async function submit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const knownFields = ['client_id', 'title', 'project_type', 'project_category', 'activity_name', 'address', 'description', 'deadline', 'client_user_id']
    const body = {}
    const customData = {}
    Object.entries(form).forEach(([key, value]) => {
      if (knownFields.includes(key)) body[key] = value
      else customData[key] = value
    })
    if (Object.keys(customData).length > 0) body.custom_data = customData
    await api.post('/work-orders', body)
    ElMessage.success('创建成功')
    visible.value = false
    fields.value.forEach(f => { form[f.field_key] = f.default_value !== undefined ? f.default_value : f.field_type === 'image' ? [] : '' })
    emit('done')
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || '创建失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>
