<template>
  <div class="kanban-col"
    :class="{ 'kanban-col-dragover': isDragOver }"
    @dragover.prevent="$emit('dragover', $event)"
    @dragleave="$emit('dragleave', $event)"
    @drop="$emit('drop', $event)">
    <div class="kanban-header">
      <div class="col-header-left">
        <el-icon v-if="col.collapsed" class="col-toggle" @click="toggle"><ArrowRight /></el-icon>
        <el-icon v-else class="col-toggle" @click="toggle"><ArrowDown /></el-icon>
        <span class="col-title">{{ col.label }}</span>
        <span class="col-count">{{ items.length }}</span>
      </div>
      <div class="col-header-right">
        <el-tooltip content="折叠列" placement="top">
          <el-icon class="col-action" @click="toggle"><Fold /></el-icon>
        </el-tooltip>
      </div>
    </div>
    <div v-if="!col.collapsed" class="kanban-body">
      <KanbanCard
        v-for="wo in items" :key="wo.id"
        :wo="wo"
        :ad-types="adTypes"
        :activities="activities"
        @contextmenu="$emit('card-contextmenu', $event, wo)"
        @dragstart="$emit('card-dragstart', $event, wo)"
        @remark="$emit('card-remark', wo)"
        @reassign="$emit('card-reassign', wo)"
      />
      <el-empty v-if="!items.length" :image-size="40" description="暂无工单" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowRight, ArrowDown, Fold } from '@element-plus/icons-vue'
import KanbanCard from './KanbanCard.vue'

const props = defineProps({
  col: { type: Object, required: true },
  items: { type: Array, default: () => [] },
  adTypes: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  isDragOver: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle', 'card-contextmenu', 'card-dragstart', 'card-remark', 'card-reassign', 'dragover', 'dragleave', 'drop'])

function toggle() {
  emit('toggle', props.col.key)
}
</script>

<style scoped>
.kanban-col {
  min-width: 260px; flex: 1;
  border-radius: 8px; overflow: hidden;
  transition: background 0.2s, box-shadow 0.2s;
}
.kanban-col-dragover {
  background: rgba(37, 99, 235, 0.05);
  box-shadow: 0 0 0 2px #2563eb;
}
.kanban-header {
  background: #f3f4f6; padding: 12px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid #e5e7eb; border-bottom: 2px solid #d1d5db;
  display: flex; align-items: center; justify-content: space-between;
}
.col-header-left { display: flex; align-items: center; gap: 4px; }
.col-toggle { cursor: pointer; color: #9ca3af; font-size: 14px; }
.col-toggle:hover { color: #2563eb; }
.col-title { font-weight: 600; font-size: 14px; color: #4b5563; }
.col-count {
  background: #e5e7eb; color: #6b7280; font-size: 12px;
  padding: 2px 8px; border-radius: 10px; font-weight: 600;
}
.col-header-right { display: flex; gap: 4px; }
.col-action { cursor: pointer; color: #9ca3af; font-size: 14px; }
.col-action:hover { color: #2563eb; }
.kanban-body {
  background: #f3f4f6; border-radius: 0 0 8px 8px;
  padding: 8px; min-height: 200px;
  border: 1px solid #e5e7eb; border-top: none;
}
</style>
