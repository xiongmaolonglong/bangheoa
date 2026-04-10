# FormConfig 页面重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 800 行的 FormConfig.vue 拆分为 3 个独立页面 + 2 个子组件，每个页面职责单一、可独立测试。

**架构：** 将表单字段配置、广告类型配置、系统配置（功能开关+材质）拆分为独立页面，通过 vuedraggable 改进拖拽体验，提取子组件降低单文件复杂度。

**技术栈：** Vue 3 + Element Plus + vuedraggable + Axios

---

## 文件清单

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 创建 | `admin-web/src/pages/settings/form-fields.vue` | 表单字段配置页（拖拽排序+CRUD） |
| 创建 | `admin-web/src/pages/settings/ad-types.vue` | 广告类型配置页（表格+展开行编辑面/属性） |
| 创建 | `admin-web/src/pages/settings/system.vue` | 系统配置页（功能开关+材质配置） |
| 创建 | `admin-web/src/components/settings/FormFieldTable.vue` | 字段拖拽表格组件 |
| 创建 | `admin-web/src/components/settings/AdTypeInlineEditor.vue` | 广告类型行内编辑组件 |
| 修改 | `admin-web/src/router/index.js` | 更新路由：form-config→form-fields，新增 ad-types/system |
| 修改 | `admin-web/src/components/layout/MainLayout.vue` | 侧边栏菜单增加新页面入口 |
| 删除 | `admin-web/src/pages/settings/FormConfig.vue` | 旧文件（拆分后删除） |

---

### 任务 1：更新路由配置

**文件：**
- 修改：`admin-web/src/router/index.js`

- [ ] **步骤 1：添加新路由**

在 router/index.js 的 settings children 中，将 `form-config` 路由替换为三个独立路由：

```js
// 替换原有的 form-config 路由
{
  path: 'form-fields',
  name: 'FormFieldsConfig',
  component: () => import('@/pages/settings/form-fields.vue'),
  meta: { title: '表单字段配置', icon: 'Document', roles: ['admin'] }
},
{
  path: 'ad-types',
  name: 'AdTypesConfig',
  component: () => import('@/pages/settings/ad-types.vue'),
  meta: { title: '广告类型配置', icon: 'Goods', roles: ['admin'] }
},
{
  path: 'system',
  name: 'SystemConfig',
  component: () => import('@/pages/settings/system.vue'),
  meta: { title: '系统配置', icon: 'Setting', roles: ['admin'] }
}
```

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/router/index.js
git commit -m "refactor: 更新路由配置，拆分表单配置页为三个独立页面"
```

---

### 任务 2：创建 FormFieldTable 组件

**文件：**
- 创建：`admin-web/src/components/settings/FormFieldTable.vue`

- [ ] **步骤 1：创建组件文件**

```vue
<template>
  <div class="form-field-table">
    <div class="table-header">
      <span class="col-drag"></span>
      <span class="col-name">字段名称</span>
      <span class="col-type">字段类型</span>
      <span class="col-required">必填</span>
      <span class="col-options">选项/单位</span>
      <span class="col-actions">操作</span>
    </div>

    <draggable
      v-model="fields"
      item-key="id"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element: field, index }">
        <div class="table-row" :class="{ dragging: isDragging && dragIndex === index }">
          <span class="col-drag">
            <el-icon class="drag-handle"><Rank /></el-icon>
          </span>
          <span class="col-name">
            <el-input v-model="field.field_name" size="small" placeholder="字段名称" />
          </span>
          <span class="col-type">
            <el-select v-model="field.field_type" size="small" style="width: 100%" @change="onTypeChange(field)">
              <el-option label="文本" value="text" />
              <el-option label="多行文本" value="textarea" />
              <el-option label="数字" value="number" />
              <el-option label="下拉选择" value="select" />
              <el-option label="单选" value="radio" />
              <el-option label="日期" value="date" />
            </el-select>
          </span>
          <span class="col-required">
            <el-switch v-model="field.is_required" :active-value="1" :inactive-value="0" size="small" />
          </span>
          <span class="col-options">
            <el-input
              v-if="['select', 'radio'].includes(field.field_type)"
              v-model="field.optionsText"
              size="small"
              placeholder="选项，逗号分隔"
            />
            <el-input
              v-else-if="field.field_type === 'number'"
              v-model="field.unit"
              size="small"
              placeholder="单位"
              style="width: 80px"
            />
            <span v-else>-</span>
          </span>
          <span class="col-actions">
            <el-button text type="danger" size="small" @click="$emit('delete', index)">删除</el-button>
          </span>
        </div>
      </template>
    </draggable>

    <el-button type="primary" text @click="$emit('add')">
      <el-icon><Plus /></el-icon> 添加字段
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Rank, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

const props = defineProps({
  fields: { type: Array, required: true }
})

const emit = defineEmits(['add', 'delete', 'update:fields'])

const isDragging = ref(false)
const dragIndex = ref(null)

const onDragEnd = () => {
  // 更新排序号
  props.fields.forEach((field, i) => {
    field.sort_order = i + 1
  })
  emit('update:fields', [...props.fields])
  isDragging.value = false
  dragIndex.value = null
}

const onTypeChange = (field) => {
  field.optionsText = ''
  field.unit = ''
}
</script>

<style scoped>
.form-field-table {
  border: 1px solid var(--border, #ebeef5);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary, #f5f7fa);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary, #303133);
  border-bottom: 1px solid var(--border, #ebeef5);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #ebeef5);
  transition: background-color 0.2s;
}

.table-row:hover {
  background: var(--bg-tertiary, #f5f7fa);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.dragging {
  opacity: 0.5;
  background: #e6f7ff;
}

.col-drag { width: 40px; text-align: center; flex-shrink: 0; }
.col-name { width: 140px; padding: 0 8px; flex-shrink: 0; }
.col-type { width: 120px; padding: 0 8px; flex-shrink: 0; }
.col-required { width: 60px; text-align: center; flex-shrink: 0; }
.col-options { flex: 1; padding: 0 8px; min-width: 100px; }
.col-actions { width: 70px; text-align: right; flex-shrink: 0; }

.drag-handle {
  cursor: grab;
  color: var(--text-tertiary, #c0c4cc);
  transition: color 0.2s;
}

.drag-handle:hover {
  color: var(--primary, #409eff);
}

.drag-handle:active {
  cursor: grabbing;
}
</style>
```

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/components/settings/FormFieldTable.vue
git commit -m "feat: 创建 FormFieldTable 组件，封装字段拖拽排序和内联编辑"
```

---

### 任务 3：创建表单字段配置页

**文件：**
- 创建：`admin-web/src/pages/settings/form-fields.vue`

- [ ] **步骤 1：创建页面文件**

```vue
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

      <div class="section-header">
        <h3>基本信息字段</h3>
        <span class="section-desc">配置新建订单时的基本信息字段，支持拖拽排序</span>
      </div>

      <FormFieldTable
        v-model:fields="fields"
        @add="addField"
        @delete="removeField"
      />
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="表单预览" width="900px" top="5vh">
      <div class="preview-container">
        <el-form label-width="100px" size="small">
          <el-row :gutter="20">
            <el-col :span="12" v-for="field in fields" :key="field.id">
              <el-form-item :label="field.field_name" :required="!!field.is_required">
                <el-input v-if="field.field_type === 'text'" :placeholder="`请输入${field.field_name}`" />
                <el-input-number v-else-if="field.field_type === 'number'" style="width: 100%" />
                <el-select v-else-if="field.field_type === 'select'" style="width: 100%" placeholder="请选择">
                  <el-option v-for="opt in (field.optionsText || '').split(',').filter(s => s.trim())" :key="opt" :label="opt" :value="opt" />
                </el-select>
                <el-date-picker v-else-if="field.field_type === 'date'" style="width: 100%" />
                <el-input v-else-if="field.field_type === 'textarea'" type="textarea" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Check } from '@element-plus/icons-vue'
import FormFieldTable from '@/components/settings/FormFieldTable.vue'
import { formApi } from '@/api'

const fields = ref([])
const saving = ref(false)
const previewVisible = ref(false)

const loadFields = async () => {
  try {
    const formRes = await formApi.getConfig()
    if (formRes.data && formRes.data.length > 0) {
      const allFields = []
      formRes.data.forEach(group => {
        if (group.fields) {
          group.fields.forEach(field => {
            let optionsText = ''
            let unit = ''
            if (field.options) {
              if (Array.isArray(field.options)) {
                optionsText = field.options.join(',')
              } else if (typeof field.options === 'object') {
                if (field.options.choices) optionsText = field.options.choices.join(',')
                if (field.options.unit) unit = field.options.unit
              }
            }
            allFields.push({ ...field, optionsText, unit })
          })
        }
      })
      if (allFields.length > 0) fields.value = allFields
    }
  } catch (e) {
    ElMessage.error('加载字段配置失败')
  }
}

const addField = () => {
  const maxId = Math.max(...fields.value.map(f => f.id || 0), 0)
  fields.value.push({
    id: maxId + 1,
    field_name: '',
    field_key: `field_${Date.now()}`,
    field_type: 'text',
    is_required: 0,
    sort_order: fields.value.length + 1,
    optionsText: '',
    unit: ''
  })
}

const removeField = (index) => {
  fields.value.splice(index, 1)
}

const handleSave = async () => {
  saving.value = true
  try {
    let groups = await formApi.getGroups()
    let defaultGroup = groups.data?.find(g => g.name === '基本信息') || groups.data?.[0]

    if (!defaultGroup) {
      const res = await formApi.createGroup({ name: '基本信息', status: 1 })
      defaultGroup = res.data
    }

    const existingFields = await formApi.getFields(defaultGroup.id)
    const existingList = existingFields.data || []
    const existingMap = new Map(existingList.map(f => [f.field_key, f]))

    for (let i = 0; i < fields.value.length; i++) {
      const field = fields.value[i]
      if (!field.field_name || !field.field_key) continue

      let optionsValue = null
      if (['select', 'radio', 'checkbox'].includes(field.field_type)) {
        if (field.optionsText && field.optionsText.trim()) {
          optionsValue = field.optionsText.split(',').map(s => s.trim()).filter(s => s)
        }
      } else if (field.field_type === 'number' && field.unit?.trim()) {
        optionsValue = { unit: field.unit.trim() }
      }

      const data = {
        group_id: defaultGroup.id,
        field_name: field.field_name,
        field_key: field.field_key,
        field_type: field.field_type,
        is_required: field.is_required,
        sort_order: i + 1,
        status: 1,
        options: optionsValue
      }

      const existing = field.id && !String(field.id).startsWith('temp')
        ? existingList.find(f => String(f.id) === String(field.id))
        : existingMap.get(field.field_key)

      if (existing) {
        await formApi.updateField(existing.id, data)
        field.id = existing.id
      } else {
        const res = await formApi.createField(data)
        if (res.data?.id) field.id = res.data.id
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

.section-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.section-header h3 { margin: 0; font-size: 16px; color: var(--text-primary, #303133); }
.section-desc { color: var(--text-secondary, #909399); font-size: 13px; }

.preview-container { max-height: 70vh; overflow-y: auto; padding-right: 8px; }
</style>
```

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/pages/settings/form-fields.vue
git commit -m "feat: 创建表单字段配置页，包含拖拽排序和保存功能"
```

---

### 任务 4：创建 AdTypeInlineEditor 组件

**文件：**
- 创建：`admin-web/src/components/settings/AdTypeInlineEditor.vue`

- [ ] **步骤 1：创建组件文件**

从 FormConfig.vue 中提取广告类型编辑逻辑。组件包含：
- el-table 展示广告类型列表
- 展开行显示面卡片（grid 布局）
- 面内属性快速添加下拉
- 复制面、删除面功能
- 默认材质选项从 props 传入

核心接口：
```js
Props: adTypes(Array), defaultMaterials(Array)
Emits: save:adType, delete:adType, update:adTypes
```

完整代码复用原 FormConfig.vue 中 `el-collapse` 内的所有模板和脚本逻辑，改为 el-table expand 模式。

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/components/settings/AdTypeInlineEditor.vue
git commit -m "feat: 创建 AdTypeInlineEditor 组件，封装广告类型表格+展开行编辑"
```

---

### 任务 5：创建广告类型配置页

**文件：**
- 创建：`admin-web/src/pages/settings/ad-types.vue`

- [ ] **步骤 1：创建页面文件**

从 FormConfig.vue 中提取广告类型配置逻辑。页面包含：
- 顶部：添加广告类型按钮
- 主体：AdTypeInlineEditor 组件
- 底部：保存按钮

数据流：
- `onMounted` → `GET /ad-types?pageSize=100` → 加载数据
- `onSave` → 遍历 adTypes → `POST/PUT /ad-types`

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/pages/settings/ad-types.vue
git commit -m "feat: 创建广告类型配置页，包含类型/面/属性管理"
```

---

### 任务 6：创建系统配置页

**文件：**
- 创建：`admin-web/src/pages/settings/system.vue`

- [ ] **步骤 1：创建页面文件**

```vue
<template>
  <div class="system-config-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
          <el-button type="primary" :loading="saving" @click="handleSave">
            <el-icon><Check /></el-icon> 保存配置
          </el-button>
        </div>
      </template>

      <!-- 功能开关 -->
      <div class="config-section">
        <h3>功能开关</h3>
        <div class="toggle-item">
          <div class="toggle-info">
            <span class="toggle-name">定位解析</span>
            <span class="toggle-desc">开启后，新建订单时可粘贴微信定位链接自动解析地址</span>
          </div>
          <el-switch v-model="features.locationParse" :active-value="1" :inactive-value="0" />
        </div>
      </div>

      <el-divider />

      <!-- 默认材质配置 -->
      <div class="config-section">
        <h3>默认材质选项</h3>
        <p class="section-desc">配置快速添加属性时的材质下拉选项</p>
        <div class="materials-tags">
          <el-tag
            v-for="(material, index) in materials"
            :key="index"
            closable
            @close="materials.splice(index, 1)"
          >
            {{ material }}
          </el-tag>
        </div>
        <div class="materials-input">
          <el-input v-model="newMaterial" placeholder="输入新材质" size="small" @keyup.enter="addMaterial" style="width: 150px" />
          <el-button size="small" @click="addMaterial">添加</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { formApi, configApi } from '@/api'

const features = reactive({ locationParse: 0 })
const materials = ref(['亚克力', '不锈钢', '铝塑板', 'PVC', '喷绘布'])
const newMaterial = ref('')
const saving = ref(false)

const loadConfig = async () => {
  try {
    const res = await configApi.getMaterials()
    if (res.data && Array.isArray(res.data)) materials.value = res.data
  } catch (e) {
    console.log('材质配置加载失败，使用默认值')
  }
  try {
    const res = await formApi.getFeatures()
    if (res.data) features.locationParse = res.data.locationParse ?? 0
  } catch (e) {
    console.log('功能开关配置不存在，使用默认值')
  }
}

const addMaterial = () => {
  const m = newMaterial.value.trim()
  if (m && !materials.value.includes(m)) {
    materials.value.push(m)
    newMaterial.value = ''
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await formApi.saveFeatures({ locationParse: features.locationParse })
    await configApi.updateMaterials(materials.value)
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.system-config-page { padding: 0; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.config-section { margin-bottom: 24px; }
.config-section h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary, #303133); }
.section-desc { color: var(--text-secondary, #909399); font-size: 13px; margin: 0 0 12px; }

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary, #f5f7fa);
  border-radius: 8px;
}

.toggle-info { display: flex; flex-direction: column; gap: 4px; }
.toggle-name { font-weight: 500; color: var(--text-primary, #303133); }
.toggle-desc { font-size: 12px; color: var(--text-secondary, #909399); }

.materials-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.materials-input { display: flex; gap: 8px; }
</style>
```

- [ ] **步骤 2：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/pages/settings/system.vue
git commit -m "feat: 创建系统配置页，包含功能开关和材质配置"
```

---

### 任务 7：更新侧边栏菜单

**文件：**
- 修改：`admin-web/src/components/layout/MainLayout.vue`

- [ ] **步骤 1：读取当前侧边栏菜单结构**

读取 `MainLayout.vue` 找到 settings 子菜单部分。

- [ ] **步骤 2：更新菜单项**

将原有的"订单表配置"替换为三个菜单项：

```html
<el-menu-item index="/settings/form-fields">
  <el-icon><Document /></el-icon>
  表单字段配置
</el-menu-item>
<el-menu-item index="/settings/ad-types">
  <el-icon><Goods /></el-icon>
  广告类型配置
</el-menu-item>
<el-menu-item index="/settings/system">
  <el-icon><Setting /></el-icon>
  系统配置
</el-menu-item>
<el-menu-item index="/settings/dispatch">
  <el-icon><Rank /></el-icon>
  派单规则
</el-menu-item>
```

- [ ] **步骤 3：Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add admin-web/src/components/layout/MainLayout.vue
git commit -m "refactor: 更新侧边栏菜单，拆分订单表配置为三个独立菜单项"
```

---

### 任务 8：删除旧文件并验证

**文件：**
- 删除：`admin-web/src/pages/settings/FormConfig.vue`

- [ ] **步骤 1：验证页面可正常访问**

在浏览器中分别访问：
- `http://localhost:5173/settings/form-fields` → 字段配置页
- `http://localhost:5173/settings/ad-types` → 广告类型配置页
- `http://localhost:5173/settings/system` → 系统配置页

- [ ] **步骤 2：删除旧文件**

```bash
rm admin-web/src/pages/settings/FormConfig.vue
```

- [ ] **步骤 3：最终 Commit**

```bash
cd C:\Users\Administrator\Desktop\10.0
git add -A
git commit -m "refactor: 删除旧 FormConfig.vue，完成页面拆分重构"
```
