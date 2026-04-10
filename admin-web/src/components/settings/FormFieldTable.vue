<template>
  <div class="form-field-table">
    <div class="table-header">
      <span class="col-drag"></span>
      <span class="col-name">字段名称</span>
      <span class="col-key">字段标识</span>
      <span class="col-type">字段类型</span>
      <span class="col-required">必填</span>
      <span class="col-placeholder">占位文本</span>
      <span class="col-default">默认值</span>
      <span class="col-options">选项/单位/规则</span>
      <span class="col-status">启用</span>
      <span class="col-actions">操作</span>
    </div>

    <draggable
      v-model="modelFields"
      item-key="id"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element: field, index }">
        <div class="table-row">
          <span class="col-drag">
            <el-icon class="drag-handle"><Rank /></el-icon>
          </span>
          <span class="col-name">
            <el-input v-model="field.field_name" size="small" placeholder="字段名称" />
          </span>
          <span class="col-key">
            <el-input v-model="field.field_key" size="small" placeholder="field_key" />
          </span>
          <span class="col-type">
            <el-select v-model="field.field_type" size="small" style="width: 100%" @change="onTypeChange(field)">
              <el-option label="文本" value="text" />
              <el-option label="多行文本" value="textarea" />
              <el-option label="数字" value="number" />
              <el-option label="手机号" value="phone" />
              <el-option label="下拉选择" value="select" />
              <el-option label="单选" value="radio" />
              <el-option label="多选" value="checkbox" />
              <el-option label="日期" value="date" />
              <el-option label="图片上传" value="image" />
              <el-option label="地图选点" value="location" />
            </el-select>
          </span>
          <span class="col-required">
            <el-switch v-model="field.is_required" :active-value="1" :inactive-value="0" size="small" />
          </span>
          <span class="col-placeholder">
            <el-input v-model="field.placeholder" size="small" placeholder="提示文本" />
          </span>
          <span class="col-default">
            <el-input v-model="field.default_value" size="small" placeholder="默认值" />
          </span>
          <span class="col-options">
            <el-input
              v-if="['select', 'radio', 'checkbox'].includes(field.field_type)"
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
            <el-input
              v-else-if="field.field_type === 'text' || field.field_type === 'phone'"
              v-model="field.validation"
              size="small"
              placeholder='如 {"min":1,"max":20,"pattern":"^1\\d{10}$"}'
            />
            <span v-else>-</span>
          </span>
          <span class="col-status">
            <el-switch v-model="field.status" :active-value="1" :inactive-value="0" size="small" />
          </span>
          <span class="col-actions">
            <el-button text type="danger" size="small" @click="$emit('delete', index)">删除</el-button>
          </span>
        </div>
      </template>
    </draggable>

    <el-button type="primary" text @click="$emit('add')" style="margin-top: 12px">
      <el-icon><Plus /></el-icon> 添加字段
    </el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Rank, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

const props = defineProps({
  fields: { type: Array, required: true }
})

const emit = defineEmits(['update:fields', 'add', 'delete'])

const modelFields = computed({
  get: () => props.fields,
  set: (val) => emit('update:fields', val)
})

const onDragEnd = () => {
  props.fields.forEach((field, i) => {
    field.sort_order = i + 1
  })
  emit('update:fields', [...props.fields])
}

const onTypeChange = (field) => {
  field.optionsText = ''
  field.unit = ''
  field.validation = ''
}
</script>

<style scoped>
.form-field-table {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.2s;
}

.table-row:hover { background: var(--bg-tertiary); }
.table-row:last-child { border-bottom: none; }

.col-drag { width: 40px; text-align: center; flex-shrink: 0; }
.col-name { width: 120px; padding: 0 8px; flex-shrink: 0; }
.col-key { width: 100px; padding: 0 8px; flex-shrink: 0; }
.col-type { width: 110px; padding: 0 8px; flex-shrink: 0; }
.col-required { width: 50px; text-align: center; flex-shrink: 0; }
.col-placeholder { width: 100px; padding: 0 8px; flex-shrink: 0; }
.col-default { width: 80px; padding: 0 8px; flex-shrink: 0; }
.col-options { flex: 1; padding: 0 8px; min-width: 100px; }
.col-status { width: 50px; text-align: center; flex-shrink: 0; }
.col-actions { width: 70px; text-align: right; flex-shrink: 0; }

.drag-handle {
  cursor: grab;
  color: var(--text-tertiary);
  transition: color 0.2s;
}
.drag-handle:hover { color: var(--brand-primary); }
.drag-handle:active { cursor: grabbing; }
</style>
