<template>
  <div class="ad-types-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>广告类型配置</span>
          <div class="header-actions">
            <el-button @click="handleExport">
              <el-icon><Download /></el-icon> 导出
            </el-button>
            <el-upload action="" :auto-upload="false" :show-file-list="false" accept=".json" @change="handleImport">
              <el-button><el-icon><Upload /></el-icon> 导入</el-button>
            </el-upload>
            <el-button type="primary" :loading="saving" @click="handleSave">
              <el-icon><Check /></el-icon> 保存
            </el-button>
          </div>
        </div>
      </template>

      <div class="ad-types-list">
        <el-collapse v-model="activeAdTypes" accordion>
          <el-collapse-item v-for="(adType, adIndex) in adTypes" :key="adType.id" :name="adType.id">
            <template #title>
              <div class="ad-type-header">
                <div class="ad-type-info">
                  <el-avatar v-if="adType.icon" :size="28" :src="adType.icon" class="type-avatar" />
                  <span class="ad-type-name">{{ adType.name || '新广告类型' }}</span>
                  <el-tag size="small" type="info">{{ adType.faces?.length || 0 }} 个面</el-tag>
                  <el-tag v-if="usageMap[adType.id]" size="small" type="success">{{ usageMap[adType.id] }} 订单</el-tag>
                </div>
                <div class="ad-type-actions" @click.stop>
                  <el-switch v-model="adType.status" :active-value="1" :inactive-value="0" size="small" />
                  <span class="status-text">{{ adType.status ? '启用' : '禁用' }}</span>
                  <el-button text type="danger" size="small" @click="removeAdType(adIndex)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </template>

            <div class="ad-type-editor">
              <div class="editor-row">
                <div class="editor-item">
                  <label>类型名称</label>
                  <el-input v-model="adType.name" placeholder="如：KT板、发光字、门头招牌" />
                </div>
                <div class="editor-item flex-2">
                  <label>类型说明</label>
                  <el-input v-model="adType.description" placeholder="简要描述该广告类型" />
                </div>
                <div class="editor-item icon-item">
                  <label>类型图标</label>
                  <el-upload action="" :auto-upload="false" :show-file-list="false" accept="image/*" @change="(file) => handleTypeIconChange(file, adType)">
                    <img v-if="adType.icon" :src="adType.icon" class="icon-preview" />
                    <el-button v-else size="small" text>
                      <el-icon><Plus /></el-icon> 上传
                    </el-button>
                  </el-upload>
                </div>
              </div>

              <div class="faces-section">
                <div class="faces-header">
                  <span class="section-title">面配置</span>
                  <div class="quick-actions">
                    <el-button size="small" @click="addFaceWithTemplate(adIndex, 'single')">
                      <el-icon><Plus /></el-icon> 添加单面
                    </el-button>
                    <el-button size="small" @click="addFaceWithTemplate(adIndex, 'double')">
                      <el-icon><Plus /></el-icon> 添加双面
                    </el-button>
                    <el-button size="small" @click="addFaceToAdType(adIndex)">
                      <el-icon><Plus /></el-icon> 自定义
                    </el-button>
                  </div>
                </div>

                <draggable
                  v-model="adType.faces"
                  item-key="face_index"
                  handle=".face-drag-handle"
                  class="face-cards"
                  @end="onFaceDragEnd(adIndex)"
                >
                  <template #item="{ element: face, index: faceIndex }">
                    <el-card class="face-card" shadow="hover">
                      <template #header>
                        <div class="face-card-header">
                          <el-icon class="face-drag-handle"><Rank /></el-icon>
                          <el-input v-model="face.face_name" placeholder="面名称" size="small" class="face-name-input" />
                          <el-upload action="" :auto-upload="false" :show-file-list="false" accept="image/*" @change="(file) => handleFaceIconChange(file, adType, faceIndex)">
                            <img v-if="face.face_icon" :src="face.face_icon" class="face-icon-preview" />
                            <el-tooltip content="设置面图标" placement="top">
                              <el-button text size="small" class="face-icon-btn">
                                <el-icon><Picture /></el-icon>
                              </el-button>
                            </el-tooltip>
                          </el-upload>
                          <el-button text size="small" @click="copyFace(adIndex, faceIndex)" title="复制此面">
                            <el-icon><CopyDocument /></el-icon>
                          </el-button>
                          <el-button text type="danger" size="small" @click="removeFace(adIndex, faceIndex)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </template>

                      <div class="attrs-section">
                        <div class="attrs-header">
                          <span>属性字段</span>
                          <el-dropdown trigger="click" @command="(cmd) => quickAddAttr(adIndex, faceIndex, cmd)">
                            <el-button size="small" type="primary" text>
                              <el-icon><Plus /></el-icon> 快速添加
                            </el-button>
                            <template #dropdown>
                              <el-dropdown-menu>
                                <el-dropdown-item command="width">宽度（米）</el-dropdown-item>
                                <el-dropdown-item command="height">高度（米）</el-dropdown-item>
                                <el-dropdown-item command="material">材质</el-dropdown-item>
                                <el-dropdown-item command="quantity">数量</el-dropdown-item>
                                <el-dropdown-item command="unit_price">单价（元/㎡）</el-dropdown-item>
                                <el-dropdown-item command="remark">备注</el-dropdown-item>
                                <el-dropdown-item command="custom" divided>自定义属性</el-dropdown-item>
                              </el-dropdown-menu>
                            </template>
                          </el-dropdown>
                        </div>

                        <draggable
                          v-model="face.attributes"
                          item-key="field_key"
                          handle=".attr-drag-handle"
                          class="attrs-list"
                          @end="onAttrDragEnd(face)"
                        >
                          <template #item="{ element: attr }">
                            <div class="attr-row">
                              <el-icon class="attr-drag-handle"><Rank /></el-icon>
                              <el-input v-model="attr.field_name" placeholder="属性名" size="small" class="attr-name" />
                              <el-select v-model="attr.field_type" size="small" class="attr-type" @change="onAttrTypeChange(attr)">
                                <el-option label="文本" value="text" />
                                <el-option label="多行" value="textarea" />
                                <el-option label="数字" value="number" />
                                <el-option label="下拉" value="select" />
                                <el-option label="单选" value="radio" />
                                <el-option label="多选" value="checkbox" />
                                <el-option label="图片" value="image" />
                                <el-option label="日期" value="date" />
                              </el-select>
                              <el-input v-if="attr.field_type === 'number'" v-model="attr.unit" placeholder="单位" size="small" class="attr-unit" />
                              <el-input v-if="['select', 'radio', 'checkbox'].includes(attr.field_type)" v-model="attr.optionsText" placeholder="选项(逗号分隔)" size="small" class="attr-options" />
                              <el-input v-else-if="attr.field_type === 'image'" v-model="attr.unit" placeholder="最大数量" size="small" class="attr-unit" />
                              <el-tooltip content="必填" placement="top">
                                <el-switch v-model="attr.is_required" :active-value="1" :inactive-value="0" size="small" />
                              </el-tooltip>
                              <el-button text type="danger" size="small" @click="removeAttr(face, attr)">
                                <el-icon><Close /></el-icon>
                              </el-button>
                            </div>
                          </template>
                        </draggable>
                        <el-empty v-if="!face.attributes?.length" description="暂无属性，请快速添加" :image-size="40" />
                      </div>
                    </el-card>
                  </template>
                </draggable>
                <el-empty v-if="!adType.faces?.length" description="请添加面配置" :image-size="60" />
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-button type="primary" @click="addAdType" class="add-ad-type-btn">
          <el-icon><Plus /></el-icon> 添加广告类型
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Check, Delete, CopyDocument, Close, Rank, Download, Upload, Picture } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { adTypeApi, configApi, uploadApi } from '@/api'

const adTypes = ref([])
const activeAdTypes = ref([])
const saving = ref(false)
const defaultMaterials = ref(['亚克力', '不锈钢', '铝塑板', 'PVC', '喷绘布'])
const usageMap = ref({})

const loadMaterials = async () => {
  try {
    const res = await configApi.getMaterials()
    if (res.data && Array.isArray(res.data)) defaultMaterials.value = res.data
  } catch (e) {}
}

const loadUsage = async () => {
  try {
    const res = await adTypeApi.getUsage()
    usageMap.value = res.data || {}
  } catch (e) {}
}

const loadData = async () => {
  await loadMaterials()
  try {
    const res = await adTypeApi.getList({ pageSize: 100 })
    const data = res.data?.list || res.data || []
    adTypes.value = data.map(t => ({
      ...t,
      faces: (t.faces || []).map(f => {
        let attributes = []
        if (f.inline_attributes && f.inline_attributes.length > 0) {
          attributes = f.inline_attributes.map(attr => ({
            ...attr,
            optionsText: Array.isArray(attr.options) ? attr.options.join(',') : (attr.optionsText || '')
          }))
        } else if (f.template?.fields) {
          attributes = f.template.fields.map(field => ({
            ...field,
            optionsText: Array.isArray(field.options) ? field.options.join(',') : ''
          }))
        }
        return { ...f, attributes, face_icon: f.face_icon || null }
      })
    }))
    if (adTypes.value.length > 0) activeAdTypes.value = [adTypes.value[0].id]
  } catch (e) {
    ElMessage.error('加载广告类型失败')
  }
}

const handleTypeIconChange = async (file, adType) => {
  try {
    const res = await uploadApi.image(file.raw)
    adType.icon = res.data?.url || res.data
    ElMessage.success('图标已更新')
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

const handleFaceIconChange = async (file, adType, faceIndex) => {
  try {
    const res = await uploadApi.image(file.raw)
    adType.faces[faceIndex].face_icon = res.data?.url || res.data
    ElMessage.success('图标已更新')
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

const addAdType = () => {
  const maxId = Math.max(...adTypes.value.map(t => t.id || 0), 0)
  const newId = maxId + 1
  adTypes.value.push({ id: newId, name: '', description: '', icon: null, status: 1, faces: [], isNew: true })
  activeAdTypes.value = [newId]
}

const removeAdType = async (index) => {
  try {
    await ElMessageBox.confirm('确定删除该广告类型？', '提示', { type: 'warning' })
    const adType = adTypes.value[index]
    if (!adType.isNew && adType.id) await adTypeApi.delete(adType.id)
    adTypes.value.splice(index, 1)
    ElMessage.success('删除成功')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

const addFaceToAdType = (adIndex) => {
  if (!adTypes.value[adIndex].faces) adTypes.value[adIndex].faces = []
  adTypes.value[adIndex].faces.push({ face_name: '', face_id: null, face_icon: null, attributes: [], images: [], face_index: `face_${Date.now()}` })
}

const addFaceWithTemplate = (adIndex, template) => {
  if (!adTypes.value[adIndex].faces) adTypes.value[adIndex].faces = []
  const defaultAttrs = [
    { field_name: '宽度', field_key: `width_${Date.now()}`, field_type: 'number', unit: '米', is_required: 1 },
    { field_name: '高度', field_key: `height_${Date.now()}`, field_type: 'number', unit: '米', is_required: 1 },
    { field_name: '材质', field_key: `material_${Date.now()}`, field_type: 'select', optionsText: defaultMaterials.value.join(','), is_required: 0 },
    { field_name: '备注', field_key: `remark_${Date.now()}`, field_type: 'textarea', is_required: 0 }
  ]
  if (template === 'single') {
    adTypes.value[adIndex].faces.push({ face_name: '正面', face_id: null, face_icon: null, attributes: JSON.parse(JSON.stringify(defaultAttrs)), images: [], face_index: `face_${Date.now()}_1` })
  } else if (template === 'double') {
    adTypes.value[adIndex].faces.push({ face_name: '正面', face_id: null, face_icon: null, attributes: JSON.parse(JSON.stringify(defaultAttrs)), images: [], face_index: `face_${Date.now()}_1` })
    adTypes.value[adIndex].faces.push({ face_name: '背面', face_id: null, face_icon: null, attributes: JSON.parse(JSON.stringify(defaultAttrs)), images: [], face_index: `face_${Date.now()}_2` })
  }
  ElMessage.success('已添加面配置')
}

const copyFace = (adIndex, faceIndex) => {
  const face = adTypes.value[adIndex].faces[faceIndex]
  const newFace = JSON.parse(JSON.stringify(face))
  newFace.face_name = face.face_name + ' (副本)'
  newFace.face_icon = face.face_icon || null
  newFace.attributes = newFace.attributes.map(attr => ({
    ...attr,
    field_key: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }))
  newFace.face_index = `face_${Date.now()}_copy`
  adTypes.value[adIndex].faces.splice(faceIndex + 1, 0, newFace)
  ElMessage.success('已复制')
}

const removeFace = (adIndex, faceIndex) => {
  adTypes.value[adIndex].faces.splice(faceIndex, 1)
}

const onFaceDragEnd = (adIndex) => {
  adTypes.value[adIndex].faces.forEach((f, i) => f.sort_order = i + 1)
}

const onAttrDragEnd = (face) => {
  face.attributes.forEach((a, i) => a.sort_order = i + 1)
}

const quickAddAttr = (adIndex, faceIndex, type) => {
  const face = adTypes.value[adIndex].faces[faceIndex]
  if (!face.attributes) face.attributes = []
  const attrTemplates = {
    width: { field_name: '宽度', field_type: 'number', unit: '米', is_required: 1 },
    height: { field_name: '高度', field_type: 'number', unit: '米', is_required: 1 },
    material: { field_name: '材质', field_type: 'select', optionsText: defaultMaterials.value.join(','), is_required: 0 },
    quantity: { field_name: '数量', field_type: 'number', unit: '个', is_required: 0 },
    unit_price: { field_name: '单价', field_type: 'number', unit: '元/㎡', is_required: 0 },
    remark: { field_name: '备注', field_type: 'textarea', is_required: 0 },
    custom: { field_name: '', field_type: 'text', is_required: 0 }
  }
  const template = attrTemplates[type]
  if (template) {
    face.attributes.push({
      ...template,
      field_key: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      optionsText: template.optionsText || ''
    })
  }
}

const removeAttr = (face, attr) => {
  const idx = face.attributes.indexOf(attr)
  if (idx > -1) face.attributes.splice(idx, 1)
}

const onAttrTypeChange = (attr) => {
  attr.optionsText = ''
  attr.unit = ''
}

const handleSave = async () => {
  saving.value = true
  try {
    for (const adType of adTypes.value) {
      const faces = (adType.faces || []).map((f, i) => ({
        face_name: f.face_name,
        face_id: f.face_id,
        face_icon: f.face_icon,
        template_id: null,
        sort_order: i + 1,
        inline_attributes: (f.attributes || []).map(attr => ({
          field_name: attr.field_name,
          field_key: attr.field_key,
          field_type: attr.field_type,
          unit: attr.unit || '',
          is_required: attr.is_required || 0,
          options: attr.optionsText ? attr.optionsText.split(',').filter(s => s.trim()) : null,
          sort_order: i + 1
        }))
      }))

      const data = { name: adType.name, description: adType.description, icon: adType.icon, status: adType.status, faces }

      if (adType.isNew || !adType.id || String(adType.id).startsWith('temp')) {
        const res = await adTypeApi.create(data)
        if (res.data?.id) { adType.id = res.data.id; adType.isNew = false }
      } else {
        await adTypeApi.update(adType.id, data)
      }
    }
    ElMessage.success('配置保存成功')
    await loadData()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleExport = async () => {
  try {
    const res = await adTypeApi.exportConfig()
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ad-types-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleImport = async (file) => {
  try {
    const text = await file.raw.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error('格式错误')

    await adTypeApi.importConfig({ data })
    ElMessage.success('导入成功')
    await loadData()
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || '文件格式错误'))
  }
}

onMounted(() => { loadData(); loadUsage() })
</script>

<style scoped>
.ad-types-page { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ad-types-list { margin-top: 16px; }
.ad-type-header { display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 16px; gap: 12px; }
.ad-type-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.ad-type-name { font-weight: 600; font-size: 15px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.type-avatar { flex-shrink: 0; }
.ad-type-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.status-text { font-size: 12px; color: var(--text-secondary); min-width: 32px; }
.ad-type-editor { padding: 20px; background: var(--bg-tertiary); border-radius: 8px; margin: 8px 0; }
.editor-row { display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-end; }
.editor-item { flex: 1; min-width: 0; }
.editor-item.flex-2 { flex: 2; }
.icon-item { flex: 0 0 100px; }
.editor-item label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.icon-preview { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
.faces-section { margin-top: 20px; }
.faces-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.section-title { font-weight: 600; font-size: 14px; color: var(--text-primary); }
.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.face-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; }
.face-card { border: 1px solid var(--border); background: var(--card-bg); border-radius: 8px; transition: box-shadow 0.2s, transform 0.2s; }
.face-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.face-card :deep(.el-card__header) { padding: 12px 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border); }
.face-card :deep(.el-card__body) { padding: 16px; }
.face-card-header { display: flex; align-items: center; gap: 8px; }
.face-drag-handle { cursor: grab; color: var(--text-muted); font-size: 16px; flex-shrink: 0; }
.face-drag-handle:active { cursor: grabbing; }
.face-name-input { flex: 1; min-width: 120px; }
.face-icon-preview { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border); }
.face-icon-btn { flex-shrink: 0; }
.face-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.attrs-section { min-height: 80px; }
.attrs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: var(--text-secondary); }
.attrs-list { display: flex; flex-direction: column; gap: 8px; }
.attr-row { display: flex; align-items: center; gap: 6px; padding: 10px 12px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 6px; transition: background-color 0.2s; }
.attr-row:hover { background: var(--bg-secondary); }
.attr-drag-handle { cursor: grab; color: var(--text-muted); font-size: 14px; flex-shrink: 0; }
.attr-drag-handle:active { cursor: grabbing; }
.attr-name { width: 80px; flex-shrink: 0; }
.attr-type { width: 80px; flex-shrink: 0; }
.attr-unit { width: 70px; flex-shrink: 0; }
.attr-options { flex: 1; min-width: 80px; }
.add-ad-type-btn { margin-top: 16px; width: 100%; border-style: dashed; height: 48px; font-size: 14px; }
:deep(.el-collapse-item__header) { height: auto; min-height: 48px; padding: 12px 16px; line-height: 1.5; }
:deep(.el-collapse-item__content) { padding: 0; }
.el-empty { padding: 20px 0; }
</style>
