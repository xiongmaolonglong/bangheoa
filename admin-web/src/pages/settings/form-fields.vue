<template>
  <div class="form-fields-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>表单字段配置</span>
          <div>
            <el-button @click="handlePreview">
              <el-icon><View /></el-icon> 预览表单
            </el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">
              <el-icon><Check /></el-icon> 保存配置
            </el-button>
          </div>
        </div>
      </template>

      <!-- 分组标签页 -->
      <div class="groups-bar">
        <el-tabs v-model="activeGroupId" type="card" class="group-tabs">
          <el-tab-pane v-for="group in groups" :key="group.id" :name="group.id">
            <template #label>
              <span class="group-tab-label">
                {{ group.name }}
                <el-icon v-if="group.id !== 1" class="group-delete" @click.stop="handleDeleteGroup(group)"><Close /></el-icon>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
        <el-button size="small" @click="handleAddGroup">
          <el-icon><Plus /></el-icon> 新建分组
        </el-button>
      </div>

      <!-- 预设模板 -->
      <div class="template-bar" v-if="groupFields.length === 0">
        <span class="template-label">快速添加模板：</span>
        <el-button v-for="tpl in templates" :key="tpl.key" size="small" @click="applyTemplate(tpl)">
          {{ tpl.name }}
        </el-button>
      </div>

      <FormFieldTable
        v-model:fields="groupFields"
        @add="addField"
        @delete="removeField"
      />
    </el-card>

    <!-- 新建分组弹窗 -->
    <el-dialog v-model="groupDialogVisible" title="新建分组" width="400px">
      <el-form :model="groupForm" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="groupSaving" @click="handleGroupSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="表单预览" width="900px" top="5vh">
      <div class="preview-container">
        <el-form label-width="100px" size="small">
          <div v-for="group in previewGroups" :key="group.id" class="preview-group">
            <h4 class="preview-group-title">{{ group.name }}</h4>
            <el-row :gutter="20">
              <el-col :span="12" v-for="field in group.fields" :key="field.id">
                <el-form-item :label="field.field_name" :required="!!field.is_required">
                  <el-input v-if="field.field_type === 'text'" :placeholder="field.placeholder || `请输入${field.field_name}`" :model-value="field.default_value || ''" />
                  <el-input v-else-if="field.field_type === 'textarea'" type="textarea" :rows="2" :placeholder="field.placeholder || `请输入${field.field_name}`" :model-value="field.default_value || ''" />
                  <el-input-number v-else-if="field.field_type === 'number'" style="width: 100%" :placeholder="field.placeholder" />
                  <el-input v-else-if="field.field_type === 'phone'" :placeholder="field.placeholder || '请输入手机号'" :model-value="field.default_value || ''" />
                  <el-select v-else-if="['select', 'radio'].includes(field.field_type)" style="width: 100%" placeholder="请选择">
                    <el-option v-for="opt in getOptions(field)" :key="opt" :label="opt" :value="opt" />
                  </el-select>
                  <template v-else-if="field.field_type === 'checkbox'">
                    <el-checkbox-group>
                      <el-checkbox v-for="opt in getOptions(field)" :key="opt" :label="opt" />
                    </el-checkbox-group>
                  </template>
                  <el-date-picker v-else-if="field.field_type === 'date'" style="width: 100%" />
                  <span v-else-if="field.field_type === 'image'" class="preview-upload">图片上传区域</span>
                  <span v-else-if="field.field_type === 'location'" class="preview-upload">地图选点区域</span>
                  <span v-else>-</span>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Check, Plus, Close } from '@element-plus/icons-vue'
import FormFieldTable from '@/components/settings/FormFieldTable.vue'
import { formApi } from '@/api'

const groups = ref([])
const activeGroupId = ref(null)
const fields = ref([]) // all fields flat
const saving = ref(false)
const previewVisible = ref(false)

// 分组管理
const groupDialogVisible = ref(false)
const groupSaving = ref(false)
const groupForm = reactive({ name: '' })

// 预设模板
const templates = [
  {
    name: '联系人信息',
    fields: [
      { field_name: '联系人', field_key: 'contact_name', field_type: 'text', is_required: 1, placeholder: '请输入联系人姓名' },
      { field_name: '联系电话', field_key: 'contact_phone', field_type: 'phone', is_required: 1, placeholder: '请输入手机号' },
      { field_name: '联系地址', field_key: 'contact_address', field_type: 'textarea', is_required: 0, placeholder: '请输入详细地址' }
    ]
  },
  {
    name: '尺寸信息',
    fields: [
      { field_name: '宽度', field_key: 'width', field_type: 'number', is_required: 0, placeholder: '请输入宽度', options: { unit: 'cm' } },
      { field_name: '高度', field_key: 'height', field_type: 'number', is_required: 0, placeholder: '请输入高度', options: { unit: 'cm' } },
      { field_name: '厚度', field_key: 'thickness', field_type: 'number', is_required: 0, placeholder: '请输入厚度', options: { unit: 'cm' } }
    ]
  },
  {
    name: '现场信息',
    fields: [
      { field_name: '现场照片', field_key: 'site_photos', field_type: 'image', is_required: 0 },
      { field_name: '安装位置', field_key: 'install_location', field_type: 'location', is_required: 0 },
      { field_name: '备注说明', field_key: 'site_remark', field_type: 'textarea', is_required: 0, placeholder: '请输入备注' }
    ]
  }
]

const groupFields = computed(() => {
  return fields.value.filter(f => f.group_id === activeGroupId.value)
})

const previewGroups = computed(() => {
  return groups.value.filter(g => g.status !== 0).map(g => ({
    ...g,
    fields: fields.value.filter(f => f.group_id === g.id && f.status !== 0)
  })).filter(g => g.fields.length > 0)
})

const getOptions = (field) => {
  if (!field.optionsText) return []
  return field.optionsText.split(',').filter(s => s.trim())
}

const loadFields = async () => {
  try {
    const formRes = await formApi.getConfig()
    if (formRes.data && formRes.data.length > 0) {
      groups.value = formRes.data
      const allFields = []
      formRes.data.forEach(group => {
        if (group.fields) {
          group.fields.forEach(field => {
            let optionsText = ''
            let unit = ''
            let validation = ''
            if (field.options) {
              if (Array.isArray(field.options)) {
                optionsText = field.options.join(',')
              } else if (typeof field.options === 'object') {
                if (field.options.choices) optionsText = field.options.choices.join(',')
                if (field.options.unit) unit = field.options.unit
                if (field.options.min !== undefined || field.options.max !== undefined || field.options.pattern) {
                  validation = JSON.stringify(field.options)
                }
              }
            }
            allFields.push({
              ...field,
              optionsText,
              unit,
              validation,
              placeholder: field.placeholder || '',
              default_value: field.default_value || ''
            })
          })
        }
      })
      fields.value = allFields

      if (!activeGroupId.value && groups.value.length > 0) {
        activeGroupId.value = groups.value[0].id
      }
    }
  } catch (e) {
    ElMessage.error('加载字段配置失败')
  }
}

const addField = () => {
  const maxId = Math.max(...fields.value.map(f => f.id || 0), 0)
  fields.value.push({
    id: maxId + 1,
    group_id: activeGroupId.value,
    field_name: '',
    field_key: `field_${Date.now()}`,
    field_type: 'text',
    is_required: 0,
    sort_order: groupFields.value.length + 1,
    optionsText: '',
    unit: '',
    validation: '',
    placeholder: '',
    default_value: '',
    status: 1
  })
}

const removeField = (index) => {
  fields.value.splice(index, 1)
}

const handleAddGroup = () => {
  groupForm.name = ''
  groupDialogVisible.value = true
}

const handleDeleteGroup = async (group) => {
  try {
    await ElMessageBox.confirm(`确定删除分组「${group.name}」及其所有字段？`, '删除确认', { type: 'warning' })
    await formApi.deleteGroup(group.id)
    ElMessage.success('删除成功')
    // 清除该组字段
    fields.value = fields.value.filter(f => f.group_id !== group.id)
    groups.value = groups.value.filter(g => g.id !== group.id)
    if (activeGroupId.value === group.id) {
      activeGroupId.value = groups.value[0]?.id || null
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败')
  }
}

const handleGroupSubmit = async () => {
  if (!groupForm.name) return ElMessage.warning('请输入分组名称')
  groupSaving.value = true
  try {
    const res = await formApi.createGroup({ name: groupForm.name, status: 1 })
    groups.value.push(res.data)
    activeGroupId.value = res.data.id
    groupDialogVisible.value = false
    ElMessage.success('创建成功')
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    groupSaving.value = false
  }
}

const applyTemplate = (tpl) => {
  const maxId = Math.max(...fields.value.map(f => f.id || 0), 0)
  tpl.fields.forEach((tf, i) => {
    fields.value.push({
      id: maxId + fields.value.length + 1,
      group_id: activeGroupId.value,
      field_name: tf.field_name,
      field_key: tf.field_key,
      field_type: tf.field_type,
      is_required: tf.is_required,
      sort_order: groupFields.value.length + i + 1,
      optionsText: Array.isArray(tf.options) ? tf.options.join(',') : '',
      unit: tf.options?.unit || '',
      validation: (tf.options?.min !== undefined || tf.options?.pattern) ? JSON.stringify(tf.options) : '',
      placeholder: tf.placeholder || '',
      default_value: tf.default_value || '',
      status: 1
    })
  })
  ElMessage.success(`已添加「${tpl.name}」模板`)
}

const handleSave = async () => {
  saving.value = true
  try {
    for (const group of groups.value) {
      const groupFieldList = fields.value.filter(f => f.group_id === group.id)

      const existingFields = await formApi.getFields(group.id)
      const existingList = existingFields.data || []

      for (let i = 0; i < groupFieldList.length; i++) {
        const field = groupFieldList[i]
        if (!field.field_name || !field.field_key) continue

        let optionsValue = null
        if (['select', 'radio', 'checkbox'].includes(field.field_type)) {
          if (field.optionsText && field.optionsText.trim()) {
            optionsValue = field.optionsText.split(',').map(s => s.trim()).filter(s => s)
          }
        } else if (field.field_type === 'number' && field.unit?.trim()) {
          optionsValue = { unit: field.unit.trim() }
        }

        // 解析验证规则
        if (field.validation?.trim()) {
          try {
            const parsed = JSON.parse(field.validation)
            if (typeof parsed === 'object') {
              if (optionsValue && typeof optionsValue === 'object') {
                optionsValue = { ...optionsValue, ...parsed }
              } else {
                optionsValue = parsed
              }
            }
          } catch {
            // ignore invalid JSON
          }
        }

        const data = {
          group_id: group.id,
          field_name: field.field_name,
          field_key: field.field_key,
          field_type: field.field_type,
          is_required: field.is_required,
          sort_order: i + 1,
          status: field.status !== undefined ? field.status : 1,
          placeholder: field.placeholder || null,
          default_value: field.default_value || null,
          options: optionsValue
        }

        const existing = field.id && !String(field.id).startsWith('temp')
          ? existingList.find(f => String(f.id) === String(field.id))
          : existingList.find(f => f.field_key === field.field_key)

        if (existing) {
          await formApi.updateField(existing.id, data)
          field.id = existing.id
        } else {
          const res = await formApi.createField(data)
          if (res.data?.id) field.id = res.data.id
        }
      }
    }

    ElMessage.success('保存成功')
    await loadFields()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handlePreview = () => {
  previewVisible.value = true
}

onMounted(() => {
  loadFields()
})
</script>

<style scoped>
.form-fields-page { padding: 0; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header > div { display: flex; gap: 8px; }

.groups-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.group-tabs { flex: 1; }

.group-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.group-delete {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  padding: 2px;
  transition: all 0.2s;
}

.group-delete:hover {
  color: var(--danger);
  background: rgba(245, 108, 108, 0.1);
}

.template-bar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.template-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.preview-container { max-height: 70vh; overflow-y: auto; padding-right: 8px; }

.preview-group { margin-bottom: 24px; }

.preview-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.preview-upload {
  color: var(--text-muted);
  font-size: 13px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  display: block;
  text-align: center;
}
</style>
