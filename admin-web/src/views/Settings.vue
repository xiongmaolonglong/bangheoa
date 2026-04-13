<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">系统配置</h1>
      <p class="page-desc">灵活配置表单字段、项目类型、材料字典等</p>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- 表单配置 -->
      <el-tab-pane label="表单配置" name="form">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>测量代录表单字段配置</span>
              <div>
                <el-button size="small" @click="resetFormConfig" :loading="resetting">重置为默认</el-button>
                <el-button size="small" type="primary" @click="saveFormConfig" :loading="saving">保存配置</el-button>
              </div>
            </div>
          </template>

          <el-table :data="formFields" row-key="field_key" border size="small" class="field-table">
            <el-table-column label="拖动排序" width="80" align="center">
              <template #default="{ $index }">
                <el-button size="small" :disabled="$index === 0" @click="moveField($index, -1)" link>↑</el-button>
                <el-button size="small" :disabled="$index === formFields.length - 1" @click="moveField($index, 1)" link>↓</el-button>
              </template>
            </el-table-column>

            <el-table-column label="字段标识" prop="field_key" width="150" />

            <el-table-column label="显示名称" width="180">
              <template #default="{ row }">
                <el-input v-model="row.field_label" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="字段类型" prop="field_type" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ fieldTypeLabel(row.field_type) }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="必填" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.required" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="显示" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.visible" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="占位提示" width="180">
              <template #default="{ row }">
                <el-input v-model="row.placeholder" size="small" placeholder="可选" />
              </template>
            </el-table-column>

            <el-table-column label="下拉选项" min-width="200">
              <template #default="{ row }">
                <template v-if="row.field_type === 'select' || row.field_type === 'client_select' || row.field_type === 'approver_select'">
                  <el-input v-model="row._optionsText" size="small" placeholder="每行一个，格式：标签|值" @change="parseOptions(row)" />
                </template>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button size="small" type="danger" link @click="removeField(row)" :disabled="isBuiltIn(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="add-field-row">
            <el-button size="small" type="primary" plain @click="showAddField = true">+ 添加自定义字段</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 项目类型 -->
      <el-tab-pane label="项目类型" name="projectType">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>项目类型管理</span>
              <div>
                <el-button size="small" type="primary" @click="saveProjectTypes" :loading="projectSaving">保存</el-button>
                <el-button size="small" type="primary" plain @click="addProjectType">+ 新增</el-button>
              </div>
            </div>
          </template>

          <el-table :data="projectTypes" row-key="value" border size="small">
            <el-table-column label="类型名称" width="200">
              <template #default="{ row }">
                <el-input v-model="row.label" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="标识" prop="value" width="150" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="排序" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.sort" size="small" :min="0" :max="999" controls-position="right" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button size="small" type="danger" link @click="removeProjectType($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="save-hint">点击「保存」按钮持久化到数据库</div>
        </el-card>
      </el-tab-pane>

      <!-- 材料字典 -->
      <el-tab-pane label="材料字典" name="material">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>材料字典管理</span>
              <div>
                <el-button size="small" type="primary" @click="saveMaterialDict" :loading="materialSaving">保存</el-button>
                <el-button size="small" type="primary" plain @click="addMaterialCategory">+ 新增分类</el-button>
              </div>
            </div>
          </template>

          <el-empty v-if="materialCategories.length === 0" description="暂无材料分类，点击右上角添加" />

          <div v-for="(cat, catIdx) in materialCategories" :key="catIdx" class="material-category">
            <div class="category-header">
              <el-input v-model="cat.name" size="small" style="width: 200px" placeholder="分类名称" />
              <el-button size="small" type="primary" plain @click="addMaterialItem(catIdx)">+ 添加材料</el-button>
              <el-button size="small" type="danger" plain @click="removeCategory(catIdx)">删除分类</el-button>
            </div>
            <el-table :data="cat.items" border size="small" class="mb-10">
              <el-table-column label="材料名称" width="200">
                <template #default="{ row }">
                  <el-input v-model="row.name" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="规格" width="150">
                <template #default="{ row }">
                  <el-input v-model="row.spec" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="单位" width="100">
                <template #default="{ row }">
                  <el-input v-model="row.unit" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="参考单价" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" size="small" :min="0" :precision="2" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index: itemIdx }">
                  <el-button size="small" type="danger" link @click="removeMaterialItem(catIdx, itemIdx)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加自定义字段对话框 -->
    <el-dialog v-model="showAddField" title="添加自定义字段" width="500px">
      <el-form :model="newField" label-width="100px">
        <el-form-item label="字段标识">
          <el-input v-model="newField.field_key" placeholder="英文标识，如 custom_field_1" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="newField.field_label" placeholder="如：客户编号" />
        </el-form-item>
        <el-form-item label="字段类型">
          <el-select v-model="newField.field_type" style="width: 100%">
            <el-option label="单行文本" value="text" />
            <el-option label="多行文本" value="textarea" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="下拉选择" value="select" />
            <el-option label="复选框" value="checkbox" />
            <el-option label="图片上传" value="image" />
            <el-option label="文件上传" value="file" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="newField.required" />
        </el-form-item>
        <el-form-item label="占位提示">
          <el-input v-model="newField.placeholder" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddField = false">取消</el-button>
        <el-button type="primary" @click="confirmAddField">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

// ==================== 表单配置 ====================
const formFields = ref([])
const saving = ref(false)
const resetting = ref(false)
const showAddField = ref(false)
const newField = ref({ field_key: '', field_label: '', field_type: 'text', required: false, placeholder: '' })

const fieldTypeMap = {
  text: '单行文本', textarea: '多行文本', number: '数字', date: '日期',
  select: '下拉选择', checkbox: '复选框', image: '图片上传', file: '文件上传',
  client_select: '甲方选择', approver_select: '审批人选择', address: '地址选择'
}
function fieldTypeLabel(type) { return fieldTypeMap[type] || type }

const builtInKeys = ['title', 'client_id', 'project_type', 'address', 'description', 'approver_id']
function isBuiltIn(row) { return builtInKeys.includes(row.field_key) }

// 初始化 options 的可编辑文本
function initOptionsText(fields) {
  fields.forEach(f => {
    if (f.options && Array.isArray(f.options)) {
      f._optionsText = f.options.map(o => `${o.label}|${o.value}`).join('\n')
    } else {
      f._optionsText = ''
    }
  })
}

function parseOptions(row) {
  if (!row._optionsText) { row.options = []; return }
  row.options = row._optionsText.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('|')
    return { label: parts[0].trim(), value: parts[1] ? parts[1].trim() : parts[0].trim() }
  })
}

function moveField(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= formFields.value.length) return
  const temp = formFields.value[index]
  formFields.value[index] = formFields.value[newIndex]
  formFields.value[newIndex] = temp
}

function removeField(row) {
  if (isBuiltIn(row)) return
  ElMessageBox.confirm(`确定删除字段「${row.field_label}」吗？`, '提示', { type: 'warning' }).then(() => {
    formFields.value = formFields.value.filter(f => f.field_key !== row.field_key)
  }).catch(() => {})
}

async function loadFormConfig() {
  try {
    const res = await api.get('/tenant/form-config/measurement_data')
    if (res.code === 0 && res.data) {
      formFields.value = res.data.fields || []
      initOptionsText(formFields.value)
    }
  } catch (err) {
    console.error('加载表单配置失败:', err)
  }
}

async function saveFormConfig() {
  saving.value = true
  try {
    // 确保 sort_order 按当前顺序
    const fields = formFields.value.map((f, i) => ({
      ...f, sort_order: i,
      options: (f.field_type === 'select' || f.field_type === 'client_select' || f.field_type === 'approver_select') ? (f.options || []) : null
    }))
    await api.put('/tenant/form-config/measurement_data', { fields })
    ElMessage.success('表单配置已保存')
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function resetFormConfig() {
  try {
    await ElMessageBox.confirm('确定重置为默认配置吗？自定义设置将被清除。', '提示', { type: 'warning' })
    resetting.value = true
    const res = await api.post('/tenant/form-config/measurement_data/reset')
    if (res.code === 0 && res.data) {
      formFields.value = res.data.fields || []
      initOptionsText(formFields.value)
      ElMessage.success('已重置为默认配置')
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('重置失败')
  } finally {
    resetting.value = false
  }
}

function confirmAddField() {
  const f = newField.value
  if (!f.field_key || !f.field_label) {
    ElMessage.warning('字段标识和显示名称为必填项')
    return
  }
  if (formFields.value.some(existing => existing.field_key === f.field_key)) {
    ElMessage.warning('字段标识已存在')
    return
  }
  formFields.value.push({
    field_key: f.field_key, field_label: f.field_label, field_type: f.field_type,
    required: f.required, visible: true, sort_order: formFields.value.length,
    placeholder: f.placeholder, options: null, default_value: null,
    validation_rules: null, help_text: null, _optionsText: ''
  })
  showAddField.value = false
  newField.value = { field_key: '', field_label: '', field_type: 'text', required: false, placeholder: '' }
}

// ==================== 项目类型 ====================
const projectTypes = ref([])
const projectSaving = ref(false)

async function loadProjectTypes() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    if (settings.project_types && settings.project_types.length) {
      projectTypes.value = settings.project_types
    } else {
      // 默认值
      projectTypes.value = [
        { label: '门头招牌', value: 'signboard', enabled: true, sort: 1 },
        { label: '室内广告', value: 'indoor', enabled: true, sort: 2 },
        { label: '灯箱', value: 'lightbox', enabled: true, sort: 3 },
        { label: 'LED显示屏', value: 'led', enabled: true, sort: 4 },
        { label: '其他', value: 'other', enabled: true, sort: 5 }
      ]
    }
  } catch {
    projectTypes.value = [
      { label: '门头招牌', value: 'signboard', enabled: true, sort: 1 },
      { label: '室内广告', value: 'indoor', enabled: true, sort: 2 },
      { label: '灯箱', value: 'lightbox', enabled: true, sort: 3 },
      { label: 'LED显示屏', value: 'led', enabled: true, sort: 4 },
      { label: '其他', value: 'other', enabled: true, sort: 5 }
    ]
  }
}

async function saveProjectTypes() {
  projectSaving.value = true
  try {
    await api.patch('/tenant/settings/project_types', { value: projectTypes.value })
    ElMessage.success('项目类型已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    projectSaving.value = false
  }
}

function addProjectType() {
  const value = 'custom_' + Date.now()
  projectTypes.value.push({ label: '新类型', value, enabled: true, sort: projectTypes.value.length + 1 })
}

function removeProjectType(index) {
  ElMessageBox.confirm('确定删除此项目类型吗？', '提示', { type: 'warning' }).then(() => {
    projectTypes.value.splice(index, 1)
  }).catch(() => {})
}

// ==================== 材料字典 ====================
const materialCategories = ref([])
const materialSaving = ref(false)

async function loadMaterialDict() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    materialCategories.value = settings.material_dict || []
  } catch {
    materialCategories.value = []
  }
}

async function saveMaterialDict() {
  materialSaving.value = true
  try {
    await api.patch('/tenant/settings/material_dict', { value: materialCategories.value })
    ElMessage.success('材料字典已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    materialSaving.value = false
  }
}

function addMaterialCategory() {
  materialCategories.value.push({ name: '新分类', items: [] })
}

function removeCategory(index) {
  ElMessageBox.confirm('确定删除此分类及所有材料吗？', '提示', { type: 'warning' }).then(() => {
    materialCategories.value.splice(index, 1)
  }).catch(() => {})
}

function addMaterialItem(catIdx) {
  materialCategories.value[catIdx].items.push({ name: '', spec: '', unit: '', price: 0 })
}

function removeMaterialItem(catIdx, itemIdx) {
  materialCategories.value[catIdx].items.splice(itemIdx, 1)
}

// ==================== 初始化 ====================
const activeTab = ref('form')

onMounted(() => {
  loadFormConfig()
  loadProjectTypes()
  loadMaterialDict()
})
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-muted { color: var(--color-text-placeholder); font-size: var(--font-size-xs); }
.mb-10 { margin-bottom: 10px; }

.config-tabs { margin-top: 16px; }
.field-table { margin-bottom: 12px; }
.add-field-row { margin-top: 12px; }

.material-category { margin-bottom: 20px; }
.category-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }

.save-hint { color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: 12px; text-align: center; }
</style>
